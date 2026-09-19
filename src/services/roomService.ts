/**
 * NEXUS ROOM & ENCLAVE MANAGEMENT SERVICE
 * 
 * Strict architectural separation:
 * 1. Room Code: Public identifier for room routing & database lookup.
 * 2. Access Codes: Salted SHA-256 verifiers authorizing entry (Creator & Guest).
 * 3. Master Room Key: 256-bit CSPRNG AES-GCM symmetric key for message cryptography.
 * 4. Key Wrapping: Master key is encrypted inside envelopes using PBKDF2-derived KWKs.
 */

import {
  supabase,
  isSupabaseConfigured,
  supabaseHost,
  isLocalEnvironment,
  localPeerHub,
  localRelayApi,
} from '../lib/supabaseClient';
import { generateRoomKey } from '../crypto/encryption';
import {
  generateSalt,
  deriveKeyWrappingKey,
  wrapRoomMasterKey,
  unwrapRoomMasterKey,
  computeAccessVerifier,
} from '../crypto/keyManagement';

export interface RoomRecord {
  id: string;
  room_code: string;
  creator_id: string;
  creator_access_verifier: string;
  guest_access_verifier: string;
  room_salt: string;
  session_salt: string;
  creator_wrapped_key: string;
  creator_key_iv: string;
  guest_wrapped_key: string;
  guest_key_iv: string;
  status: string;
  created_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  role: 'CREATOR' | 'GUEST' | 'MEMBER';
  joined_at: string;
}

export interface ActiveSession {
  roomId: string;
  roomCode: string;
  userId: string;
  username: string;
  userAccessCode: string;
  role: 'CREATOR' | 'GUEST' | 'MEMBER';
  masterKey: CryptoKey;
  guestAccessCode?: string;
  salt: string;
}

export interface JoinDiagnostics {
  transport: 'SUPABASE' | 'LOCAL_DEV_RELAY' | 'LOCAL_MOCK' | 'UNCONFIGURED_PRODUCTION';
  supabaseConfigured: boolean;
  supabaseHost: string;
  roomCodePresent: boolean;
  roomLookupAttempted: boolean;
  roomFound: boolean;
  roomIdPresent: boolean;
  guestVerifierPresent: boolean;
  sessionSaltPresent: boolean;
  guestWrappedKeyPresent: boolean;
  guestKeyIvPresent: boolean;
  supabaseError: string | null;
  verifierResult: 'SUCCESS' | 'FAIL' | 'PENDING';
  unwrapResult: 'SUCCESS' | 'FAIL' | 'PENDING';
  errorStage: 'NONE' | 'ROOM_LOOKUP' | 'VERIFIER' | 'KEY_UNWRAP' | 'REGISTRATION' | 'NETWORK' | 'CONFIG';
  errorMessage: string | null;
}

const defaultTransport: 'SUPABASE' | 'LOCAL_DEV_RELAY' | 'UNCONFIGURED_PRODUCTION' = isSupabaseConfigured
  ? 'SUPABASE'
  : isLocalEnvironment
  ? 'LOCAL_DEV_RELAY'
  : 'UNCONFIGURED_PRODUCTION';

let latestDiagnostics: JoinDiagnostics = {
  transport: defaultTransport,
  supabaseConfigured: isSupabaseConfigured,
  supabaseHost: supabaseHost,
  roomCodePresent: false,
  roomLookupAttempted: false,
  roomFound: false,
  roomIdPresent: false,
  guestVerifierPresent: false,
  sessionSaltPresent: false,
  guestWrappedKeyPresent: false,
  guestKeyIvPresent: false,
  supabaseError: null,
  verifierResult: 'PENDING',
  unwrapResult: 'PENDING',
  errorStage: 'NONE',
  errorMessage: null,
};

export function getLatestJoinDiagnostics(): JoinDiagnostics {
  return { ...latestDiagnostics };
}

// Local mock storage for offline/fallback mode
const LOCAL_ROOMS_KEY = 'nexus_simulated_rooms_v2';
const memoryFallbackRooms: Record<string, RoomRecord> = {};

export function getLocalRooms(): Record<string, RoomRecord> {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_ROOMS_KEY);
      return raw ? JSON.parse(raw) : {};
    }
    return { ...memoryFallbackRooms };
  } catch {
    return { ...memoryFallbackRooms };
  }
}

export function saveLocalRooms(rooms: Record<string, RoomRecord>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
    } else {
      Object.assign(memoryFallbackRooms, rooms);
    }
  } catch {}
}

export function clearLocalRooms(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_ROOMS_KEY);
    }
    for (const key of Object.keys(memoryFallbackRooms)) {
      delete memoryFallbackRooms[key];
    }
  } catch {}
}

// Rate-limiting tracker (max 5 failed attempts per 30 seconds per room code)
const failedAttemptsMap = new Map<string, { count: number; lastAttempt: number }>();

function checkRateLimit(roomCode: string): void {
  const now = Date.now();
  const entry = failedAttemptsMap.get(roomCode);
  if (entry) {
    if (now - entry.lastAttempt < 30000 && entry.count >= 5) {
      const waitSeconds = Math.ceil((30000 - (now - entry.lastAttempt)) / 1000);
      throw new Error(`SECURITY ALERT // Rate limit exceeded. Too many failed attempts. Try again in ${waitSeconds}s.`);
    }
    if (now - entry.lastAttempt >= 30000) {
      failedAttemptsMap.delete(roomCode);
    }
  }
}

function recordFailedAttempt(roomCode: string): void {
  const now = Date.now();
  const entry = failedAttemptsMap.get(roomCode) || { count: 0, lastAttempt: now };
  entry.count += 1;
  entry.lastAttempt = now;
  failedAttemptsMap.set(roomCode, entry);
}

/**
 * Creates a new private E2EE room enclave with persistent database key envelopes.
 */
export async function createRoom(
  userId: string,
  username: string,
  roomCode: string,
  creatorAccessCode: string,
  customGuestAccessCode: string = '2266'
): Promise<ActiveSession> {
  const cleanRoomCode = roomCode.trim().toUpperCase();
  const cleanCreatorCode = creatorAccessCode.trim();
  const cleanGuestCode = customGuestAccessCode.trim();

  if (!cleanRoomCode || cleanRoomCode.length < 3) {
    throw new Error('Room code must be at least 3 alphanumeric characters.');
  }
  if (!cleanCreatorCode || cleanCreatorCode.length !== 4 || !/^\d{4}$/.test(cleanCreatorCode)) {
    throw new Error('Creator Access Code must be exactly 4 digits.');
  }
  if (!cleanGuestCode || cleanGuestCode.length !== 4 || !/^\d{4}$/.test(cleanGuestCode)) {
    throw new Error('Guest Join Access Code must be exactly 4 digits.');
  }

  // 1. Generate 256-bit cryptographically random AES-GCM Master Room Key using CSPRNG
  const masterKey = await generateRoomKey();
  const roomSalt = generateSalt();
  const sessionSalt = generateSalt();

  // 2. Derive independent Key Wrapping Keys for creator and guest via PBKDF2 (100,000 iterations)
  const creatorKWK = await deriveKeyWrappingKey(`${cleanRoomCode}:${cleanCreatorCode}`, sessionSalt);
  const guestKWK = await deriveKeyWrappingKey(`${cleanRoomCode}:${cleanGuestCode}`, sessionSalt);

  // 3. Encrypt the Master Room Key into separate security envelopes
  const creatorWrapped = await wrapRoomMasterKey(masterKey, creatorKWK);
  const guestWrapped = await wrapRoomMasterKey(masterKey, guestKWK);

  // 4. Compute salted SHA-256 access authorization verifiers
  const creatorVerifier = await computeAccessVerifier(cleanCreatorCode, roomSalt);
  const guestVerifier = await computeAccessVerifier(cleanGuestCode, roomSalt);

  const roomId = crypto.randomUUID();
  const newRoom: RoomRecord = {
    id: roomId,
    room_code: cleanRoomCode,
    creator_id: userId,
    creator_access_verifier: creatorVerifier,
    guest_access_verifier: guestVerifier,
    room_salt: roomSalt,
    session_salt: sessionSalt,
    creator_wrapped_key: creatorWrapped.wrappedKey,
    creator_key_iv: creatorWrapped.iv,
    guest_wrapped_key: guestWrapped.wrappedKey,
    guest_key_iv: guestWrapped.iv,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };

  // Check configuration in production
  if (!isSupabaseConfigured && !isLocalEnvironment) {
    throw new Error(
      'NEXUS CONFIGURATION ERROR // Supabase credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are missing in this production deployment. Please configure environment variables in Netlify site settings and trigger a rebuild.'
    );
  }

  // 5. Persist to Supabase if configured
  if (isSupabaseConfigured && supabase) {
    const { data: existing, error: lookupError } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_code', cleanRoomCode)
      .maybeSingle();

    if (lookupError) {
      console.warn('Supabase room lookup error:', lookupError.message);
    }

    if (existing) {
      throw new Error(`Room code "${cleanRoomCode}" is already active. Choose another code.`);
    }

    const { error: insertError } = await supabase.from('rooms').insert([
      {
        ...newRoom,
        // Also provide fallback legacy column names for compatibility
        creator_code_hash: creatorVerifier,
        guest_join_code_hash: guestVerifier,
      },
    ]);

    if (insertError) {
      console.error('Supabase room insert error:', insertError.message);
      throw new Error(`DATABASE ERROR // Failed to create room in Supabase: ${insertError.message}`);
    }

    const { error: memberError } = await supabase.from('room_members').insert([
      {
        room_id: roomId,
        user_id: userId,
        username: username,
        role: 'CREATOR',
      },
    ]);

    if (memberError) {
      console.warn('Supabase member insert warning:', memberError.message);
    }
  }

  // 6. Also persist to local dev relay API ONLY in local development
  if (isLocalEnvironment) {
    await localRelayApi.createRoom(newRoom);
  }

  // 7. Also save in localStorage and broadcast on localPeerHub
  const localRooms = getLocalRooms();
  localRooms[cleanRoomCode] = newRoom;
  saveLocalRooms(localRooms);
  localPeerHub.broadcast(cleanRoomCode, { type: 'ROOM_CREATED', room: newRoom });

  return {
    roomId,
    roomCode: cleanRoomCode,
    userId,
    username,
    userAccessCode: cleanCreatorCode,
    role: 'CREATOR',
    masterKey,
    guestAccessCode: cleanGuestCode,
    salt: roomSalt,
  };
}

/**
 * Validates access credentials and authorizes entry into an existing E2EE room enclave.
 * Works seamlessly across independent browsers, incognito sessions, and after page refreshes.
 */
export async function joinRoom(
  userId: string,
  username: string,
  roomCode: string,
  accessCode: string
): Promise<ActiveSession> {
  const cleanRoomCode = roomCode.trim().toUpperCase();
  const cleanAccessCode = accessCode.trim();

  const defaultJoinTransport: 'SUPABASE' | 'LOCAL_DEV_RELAY' | 'UNCONFIGURED_PRODUCTION' = isSupabaseConfigured
    ? 'SUPABASE'
    : isLocalEnvironment
    ? 'LOCAL_DEV_RELAY'
    : 'UNCONFIGURED_PRODUCTION';

  // Reset diagnostic state for this join attempt
  latestDiagnostics = {
    transport: defaultJoinTransport,
    supabaseConfigured: isSupabaseConfigured,
    supabaseHost: supabaseHost,
    roomCodePresent: Boolean(cleanRoomCode),
    roomLookupAttempted: true,
    roomFound: false,
    roomIdPresent: false,
    guestVerifierPresent: false,
    sessionSaltPresent: false,
    guestWrappedKeyPresent: false,
    guestKeyIvPresent: false,
    supabaseError: null,
    verifierResult: 'PENDING',
    unwrapResult: 'PENDING',
    errorStage: 'NONE',
    errorMessage: null,
  };

  // Enforce configuration in production
  if (!isSupabaseConfigured && !isLocalEnvironment) {
    latestDiagnostics.transport = 'UNCONFIGURED_PRODUCTION';
    latestDiagnostics.errorStage = 'CONFIG';
    latestDiagnostics.errorMessage =
      'NEXUS CONFIGURATION ERROR // Supabase credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are missing in this production deployment.';
    throw new Error(
      'NEXUS CONFIGURATION ERROR // Supabase credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are missing in this production deployment. Please configure environment variables in Netlify site settings and trigger a rebuild.'
    );
  }

  checkRateLimit(cleanRoomCode);

  if (!cleanRoomCode) {
    latestDiagnostics.errorStage = 'ROOM_LOOKUP';
    latestDiagnostics.errorMessage = 'Please enter a room code.';
    throw new Error('Please enter a room code.');
  }
  if (!cleanAccessCode || cleanAccessCode.length !== 4 || !/^\d{4}$/.test(cleanAccessCode)) {
    latestDiagnostics.errorStage = 'VERIFIER';
    latestDiagnostics.errorMessage = 'Access Code must be exactly 4 digits.';
    throw new Error('Access Code must be exactly 4 digits.');
  }

  let room: RoomRecord | null = null;

  // STEP 1: Room Lookup (Multi-Tier: Supabase in all modes, Local Dev Relay only in local development)
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', cleanRoomCode)
      .maybeSingle();

    if (error) {
      latestDiagnostics.supabaseError = error.message;
      console.warn('Supabase lookup error:', error.message);
    }

    if (data) {
      room = {
        id: data.id,
        room_code: data.room_code,
        creator_id: data.creator_id,
        creator_access_verifier: data.creator_access_verifier || data.creator_code_hash,
        guest_access_verifier: data.guest_access_verifier || data.guest_join_code_hash,
        room_salt: data.room_salt,
        session_salt: data.session_salt || data.room_salt,
        creator_wrapped_key: data.creator_wrapped_key,
        creator_key_iv: data.creator_key_iv,
        guest_wrapped_key: data.guest_wrapped_key,
        guest_key_iv: data.guest_key_iv,
        status: data.status,
        created_at: data.created_at,
      };
      latestDiagnostics.transport = 'SUPABASE';
    }
  }

  // If not found in Supabase (or running in local dev environment), check local dev server relay
  if (!room && isLocalEnvironment) {
    const relayRoom = await localRelayApi.getRoom(cleanRoomCode);
    if (relayRoom) {
      room = relayRoom;
      latestDiagnostics.transport = 'LOCAL_DEV_RELAY';
    }
  }

  // Fallback to localStorage ONLY in local environment
  if (!room && isLocalEnvironment) {
    const localRooms = getLocalRooms();
    if (localRooms[cleanRoomCode]) {
      room = localRooms[cleanRoomCode];
      latestDiagnostics.transport = 'LOCAL_MOCK';
    }
  }

  if (!room) {
    recordFailedAttempt(cleanRoomCode);
    latestDiagnostics.roomFound = false;
    latestDiagnostics.errorStage = 'ROOM_LOOKUP';
    latestDiagnostics.errorMessage = 'ROOM NOT FOUND // Check the Room Code.';
    throw new Error('ROOM NOT FOUND // Check the Room Code.');
  }

  latestDiagnostics.roomFound = true;
  latestDiagnostics.roomIdPresent = Boolean(room.id);
  latestDiagnostics.guestVerifierPresent = Boolean(room.guest_access_verifier);
  latestDiagnostics.sessionSaltPresent = Boolean(room.session_salt);
  latestDiagnostics.guestWrappedKeyPresent = Boolean(room.guest_wrapped_key);
  latestDiagnostics.guestKeyIvPresent = Boolean(room.guest_key_iv);

  // STEP 2: Verify Guest Authorization (Check Access Code against salted verifier)
  const inputVerifier = await computeAccessVerifier(cleanAccessCode, room.room_salt);
  const isGuest = inputVerifier === room.guest_access_verifier;
  const isCreator = inputVerifier === room.creator_access_verifier;

  if (!isGuest && !isCreator) {
    recordFailedAttempt(cleanRoomCode);
    latestDiagnostics.verifierResult = 'FAIL';
    latestDiagnostics.errorStage = 'VERIFIER';
    latestDiagnostics.errorMessage = 'ACCESS DENIED // Guest Room Access Code is invalid.';
    throw new Error('ACCESS DENIED // Guest Room Access Code is invalid.');
  }

  latestDiagnostics.verifierResult = 'SUCCESS';

  // STEP 3: Derive Key Wrapping Key (KWK) from room credentials and persistent salt
  const kwk = await deriveKeyWrappingKey(
    `${cleanRoomCode}:${cleanAccessCode}`,
    room.session_salt
  );

  // STEP 4: Unwrap the independent 256-bit Master AES-GCM Room Key
  const wrappedKey = isCreator ? room.creator_wrapped_key : room.guest_wrapped_key;
  const keyIv = isCreator ? room.creator_key_iv : room.guest_key_iv;

  let masterKey: CryptoKey;
  try {
    masterKey = await unwrapRoomMasterKey(wrappedKey, keyIv, kwk);
    latestDiagnostics.unwrapResult = 'SUCCESS';
  } catch (err: unknown) {
    recordFailedAttempt(cleanRoomCode);
    latestDiagnostics.unwrapResult = 'FAIL';
    latestDiagnostics.errorStage = 'KEY_UNWRAP';
    latestDiagnostics.errorMessage = 'CRYPTOGRAPHIC ERROR // Key unwrap authentication failed.';
    throw new Error('CRYPTOGRAPHIC ERROR // Key unwrap authentication failed.');
  }

  const role: 'CREATOR' | 'GUEST' = isCreator ? 'CREATOR' : 'GUEST';

  // STEP 5: Register member in room
  const memberRecord = {
    id: 'mem_' + userId,
    room_id: room.id,
    user_id: userId,
    username: username,
    role: role,
    joined_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    await supabase.from('room_members').upsert(
      {
        room_id: room.id,
        user_id: userId,
        username: username,
        role: role,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'room_id,user_id' }
    );
  }

  // Also register in local dev relay ONLY in local development
  if (isLocalEnvironment) {
    await localRelayApi.registerMember(cleanRoomCode, memberRecord);
  }

  localPeerHub.broadcast(cleanRoomCode, {
    type: 'USER_JOINED',
    user: memberRecord,
  });

  return {
    roomId: room.id,
    roomCode: cleanRoomCode,
    userId,
    username,
    userAccessCode: cleanAccessCode,
    role,
    masterKey,
    salt: room.room_salt,
  };
}

