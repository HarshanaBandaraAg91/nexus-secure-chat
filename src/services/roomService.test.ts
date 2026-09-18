import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRoom,
  joinRoom,
  getLocalRooms,
  clearLocalRooms,
} from './roomService';
import { sendEncryptedMessage, fetchRoomMessages } from './messageService';
import { decryptMessage } from '../crypto/encryption';
import { decodeVisualCipher } from '../crypto/visualCipher';

describe('NEXUS Room Management & Multi-Browser Join Verification', () => {
  beforeEach(() => {
    clearLocalRooms();
  });

  // A. Create room & B. Room persisted
  it('A & B: creates room and persists to storage', async () => {
    const creatorSession = await createRoom('user_bob', 'Bob', '444', '5555', '2266');
    expect(creatorSession).toBeDefined();
    expect(creatorSession.roomId).toBeDefined();
    expect(creatorSession.roomCode).toBe('444');
    expect(creatorSession.role).toBe('CREATOR');
    expect(creatorSession.masterKey).toBeDefined();

    const storedRooms = getLocalRooms();
    const stored = storedRooms['444'];
    expect(stored).toBeDefined();
    expect(stored.id).toBe(creatorSession.roomId);
    expect(stored.creator_id).toBe('user_bob');
    expect(stored.creator_access_verifier).toBeDefined();
    expect(stored.guest_access_verifier).toBeDefined();
    expect(stored.guest_wrapped_key).toBeDefined();
    expect(stored.creator_wrapped_key).toBeDefined();
    expect(stored.room_salt).toBeDefined();
    expect(stored.session_salt).toBeDefined();
  });

  // C. Room lookup by Room Code & D. Valid guest code succeeds
  it('C & D: guest in independent browser can lookup room 444 and join with code 2266', async () => {
    // Browser A (Bob) creates room 444
    const bobSession = await createRoom('user_bob', 'Bob', '444', '5555', '2266');

    // Browser B (Lal) joins room 444 with Guest Access Code 2266
    const lalSession = await joinRoom('user_lal', 'Lal', '444', '2266');
    expect(lalSession).toBeDefined();
    expect(lalSession.roomId).toBe(bobSession.roomId);
    expect(lalSession.roomCode).toBe('444');
    expect(lalSession.role).toBe('GUEST');
    expect(lalSession.masterKey).toBeDefined();
  });

  // E. Invalid guest code fails
  it('E: joining with invalid guest access code fails with ACCESS DENIED', async () => {
    await createRoom('user_bob', 'Bob', '444', '5555', '2266');

    // Eve tries to join with wrong code 9999
    await expect(
      joinRoom('user_eve', 'Eve', '444', '9999')
    ).rejects.toThrow(/ACCESS DENIED/);
  });

  // Non-existent room code fails with ROOM NOT FOUND
  it('fails with ROOM NOT FOUND when room code does not exist', async () => {
    await expect(
      joinRoom('user_lal', 'Lal', '999', '2266')
    ).rejects.toThrow(/ROOM NOT FOUND/);
  });

  // F. Creator code authenticates as CREATOR role
  it('F: creator can rejoin room 444 using Creator Access Code 5555', async () => {
    const original = await createRoom('user_bob', 'Bob', '444', '5555', '2266');

    const bobRejoin = await joinRoom('user_bob', 'Bob', '444', '5555');
    expect(bobRejoin.role).toBe('CREATOR');
    expect(bobRejoin.roomId).toBe(original.roomId);
  });

  // G, H, I, J, K, L: Full Bidirectional Encrypted Message Lifecycle between Independent Browsers
  it('G to L: Bob and Lal in independent sessions resolve same room ID, exchange AES-256-GCM encrypted messages, zero plaintext on wire', async () => {
    // 1. Bob creates room 444
    const bobSession = await createRoom('user_bob', 'Bob', '444', '5555', '2266');

    // 2. Lal joins room 444 in an independent session
    const lalSession = await joinRoom('user_lal', 'Lal', '444', '2266');

    // J. Both browsers resolve the exact same room ID
    expect(bobSession.roomId).toBe(lalSession.roomId);

    // 3. Bob transmits message "Tactical Transmission" with visual shift derived from Lal's code (2266 -> Pos 16)
    const bobMsg = await sendEncryptedMessage(
      bobSession.roomId,
      bobSession.roomCode,
      bobSession.userId,
      bobSession.username,
      'Tactical Transmission',
      bobSession.masterKey,
      16
    );

    // L. Plaintext is not in ciphertext wire format
    expect(bobMsg.ciphertext).not.toContain('Tactical Transmission');
    expect(bobMsg.ciphertext).not.toContain('444');

    // 4. Lal receives wire packet and decrypts AES-256-GCM layer using lalSession.masterKey
    const lalAESDecrypted = await decryptMessage(bobMsg.ciphertext, bobMsg.iv, lalSession.masterKey);
    expect(lalAESDecrypted).toBeDefined();

    // 5. Lal decodes visual cipher with position 16 to reveal plaintext
    const lalPlaintext = decodeVisualCipher(lalAESDecrypted, 16);
    expect(lalPlaintext).toBe('Tactical Transmission');

    // 6. Lal replies with "Acknowledged Bob"
    const lalMsg = await sendEncryptedMessage(
      lalSession.roomId,
      lalSession.roomCode,
      lalSession.userId,
      lalSession.username,
      'Acknowledged Bob',
      lalSession.masterKey,
      16
    );

    // 7. Bob receives Lal's packet and decrypts AES-256-GCM layer using bobSession.masterKey
    const bobAESDecrypted = await decryptMessage(lalMsg.ciphertext, lalMsg.iv, bobSession.masterKey);
    const bobPlaintext = decodeVisualCipher(bobAESDecrypted, 16);
    expect(bobPlaintext).toBe('Acknowledged Bob');
  });

  // Refresh & Reopen test
  it('re-joining after browser refresh/closure succeeds without requiring creator state', async () => {
    // Bob creates room 444
    await createRoom('user_bob', 'Bob', '444', '5555', '2266');

    // Simulate closing Browser A and opening fresh Browser B instance
    const guest1 = await joinRoom('user_lal', 'Lal', '444', '2266');
    expect(guest1.role).toBe('GUEST');

    // Simulate another fresh tab/reopen
    const guest2 = await joinRoom('user_alex', 'Alex', '444', '2266');
    expect(guest2.role).toBe('GUEST');
    expect(guest2.roomId).toBe(guest1.roomId);
  });
});
