/**
 * NEXUS REALTIME ENCRYPTED MESSAGE SERVICE
 */

import {
  supabase,
  isSupabaseConfigured,
  isLocalEnvironment,
  localPeerHub,
  localRelayApi,
} from '../lib/supabaseClient';
import { encryptMessage, decryptMessage } from '../crypto/encryption';
import { encodeVisualCipher } from '../crypto/visualCipher';

export interface EncryptedMessageRecord {
  id: string;
  room_id: string;
  sender_id: string;
  sender_username: string;
  ciphertext: string; // Base64 AES-256-GCM
  iv: string;         // Base64 12-byte IV
  visual_shift: number;
  created_at: string;
}

export interface ProcessedChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  ciphertext: string;
  iv: string;
  visualShift: number;
  createdAt: string;
  isSelf: boolean;
  // Decrypted layer states
  aesDecryptedText: string | null;  // Text after AES-GCM decryption (e.g. "pbbp")
  visualDecryptedText: string | null; // Text after visual cipher decode (e.g. "amma")
  isVisualDecrypted: boolean;
  decryptionError?: string;
}

/**
 * Encrypts and transmits a message over Supabase Realtime / Local Relay / Broadcast channel.
 * 
 * Pipeline:
 * Plaintext ("amma") -> Visual Cipher ("pbbp") -> AES-256-GCM Encrypt -> Database / Realtime Wire
 */
export async function sendEncryptedMessage(
  roomId: string,
  roomCode: string,
  senderId: string,
  senderUsername: string,
  plaintext: string,
  masterKey: CryptoKey,
  visualShiftPosition: number = 1
): Promise<ProcessedChatMessage> {
  const cleanRoomCode = roomCode.trim().toUpperCase();

  // 1. Transform plaintext to visual cipher representation (e.g. "amma" -> "pbbp")
  const visualCipherText = encodeVisualCipher(plaintext, visualShiftPosition);

  // 2. Encrypt the visual cipher payload with Master AES-256-GCM Key and unique 12-byte IV
  const { ciphertext, iv } = await encryptMessage(visualCipherText, masterKey);

  const messageId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const record: EncryptedMessageRecord = {
    id: messageId,
    room_id: roomId,
    sender_id: senderId,
    sender_username: senderUsername,
    ciphertext,
    iv,
    visual_shift: visualShiftPosition,
    created_at: createdAt,
  };

  // 3. Persist and Broadcast
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('messages').insert([record]);
    if (error) {
      console.error('Failed to persist encrypted message to Supabase:', error);
      throw new Error(`DATABASE ERROR // Failed to persist message: ${error.message}`);
    }
  } else if (!isLocalEnvironment) {
    throw new Error('NEXUS CONFIGURATION ERROR // Supabase is not configured in this production deployment.');
  }

  // Also broadcast to local relay (for dev server / cross-browser testing ONLY in local development)
  if (isLocalEnvironment) {
    await localRelayApi.sendMessage(cleanRoomCode, record);
  }

  // Also broadcast via multi-tab peer hub
  localPeerHub.broadcast(cleanRoomCode, {
    type: 'NEW_MESSAGE',
    message: record,
  });

  return {
    id: messageId,
    roomId,
    senderId,
    senderUsername,
    ciphertext,
    iv,
    visualShift: visualShiftPosition,
    createdAt,
    isSelf: true,
    aesDecryptedText: visualCipherText,
    visualDecryptedText: plaintext,
    isVisualDecrypted: true,
  };
}

/**
 * Loads recent encrypted messages from room.
 */
export async function fetchRoomMessages(
  roomId: string,
  roomCode: string,
  currentUserId: string,
  masterKey: CryptoKey
): Promise<ProcessedChatMessage[]> {
  const cleanRoomCode = roomCode.trim().toUpperCase();
  let rawRecords: EncryptedMessageRecord[] = [];

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      rawRecords = data as EncryptedMessageRecord[];
    }
  }

  // If Supabase returned nothing or is unconfigured, check local relay ONLY in local development
  if (rawRecords.length === 0 && isLocalEnvironment) {
    const localMsgs = await localRelayApi.getMessages(cleanRoomCode);
    if (localMsgs && localMsgs.length > 0) {
      rawRecords = localMsgs;
    }
  }

  const processed: ProcessedChatMessage[] = [];
  for (const row of rawRecords) {
    let aesDecrypted: string | null = null;
    let decryptionError: string | undefined = undefined;

    try {
      aesDecrypted = await decryptMessage(row.ciphertext, row.iv, masterKey);
    } catch {
      decryptionError = 'AES Decryption Failed';
    }

    const isSelf = row.sender_id === currentUserId;

    processed.push({
      id: row.id,
      roomId: row.room_id,
      senderId: row.sender_id,
      senderUsername: row.sender_username,
      ciphertext: row.ciphertext,
      iv: row.iv,
      visualShift: row.visual_shift || 1,
      createdAt: row.created_at,
      isSelf,
      aesDecryptedText: aesDecrypted,
      visualDecryptedText: null, // Left encrypted for receiver until decrypted
      isVisualDecrypted: isSelf, // Self messages already known
      decryptionError,
    });
  }

  return processed;
}

/**
 * Subscribes to real-time incoming messages for a room.
 */
export function subscribeToRoom(
  roomId: string,
  roomCode: string,
  currentUserId: string,
  masterKey: CryptoKey,
  onMessageReceived: (msg: ProcessedChatMessage) => void,
  onPeerEvent?: (event: unknown) => void
): () => void {
  const cleanRoomCode = roomCode.trim().toUpperCase();

  const handleIncomingRecord = async (row: EncryptedMessageRecord) => {
    const isSelf = row.sender_id === currentUserId;

    let aesDecrypted: string | null = null;
    let decryptionError: string | undefined = undefined;

    try {
      aesDecrypted = await decryptMessage(row.ciphertext, row.iv, masterKey);
    } catch {
      decryptionError = 'AES Decryption Failed';
    }

    const processed: ProcessedChatMessage = {
      id: row.id,
      roomId: row.room_id,
      senderId: row.sender_id,
      senderUsername: row.sender_username,
      ciphertext: row.ciphertext,
      iv: row.iv,
      visualShift: row.visual_shift || 1,
      createdAt: row.created_at,
      isSelf,
      aesDecryptedText: aesDecrypted,
      visualDecryptedText: null,
      isVisualDecrypted: isSelf,
      decryptionError,
    };

    onMessageReceived(processed);
  };

  // 1. Supabase Realtime Subscription
  const activeSupabase = isSupabaseConfigured ? supabase : null;
  let supabaseChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

  if (activeSupabase) {
    supabaseChannel = activeSupabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          handleIncomingRecord(payload.new as EncryptedMessageRecord);
        }
      )
      .subscribe();
  }

  // 2. Local Relay (SSE + BroadcastChannel) Subscription
  const unsubscribeLocal = localRelayApi.subscribeToEvents(
    cleanRoomCode,
    (msg: EncryptedMessageRecord) => {
      handleIncomingRecord(msg);
    },
    onPeerEvent
  );

  return () => {
    if (supabaseChannel && activeSupabase) {
      activeSupabase.removeChannel(supabaseChannel);
    }
    unsubscribeLocal();
  };
}
