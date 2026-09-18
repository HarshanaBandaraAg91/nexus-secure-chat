import { webcrypto } from 'crypto';

// Polyfill Web Crypto for Node environment if needed
if (!globalThis.crypto?.subtle) {
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

import {
  generateRoomKey,
  encryptMessage,
  decryptMessage,
} from '../src/crypto/encryption';
import {
  generateSalt,
  deriveKeyWrappingKey,
  wrapRoomMasterKey,
  unwrapRoomMasterKey,
  computeAccessVerifier,
} from '../src/crypto/keyManagement';

async function runLiveE2ETest() {
  console.log('====================================================');
  console.log('NEXUS LIVE E2E TWO-BROWSER SIMULATION TEST');
  console.log('Target: http://localhost:3000/api/nexus');
  console.log('====================================================\n');

  // 1. Health check
  const healthRes = await fetch('http://localhost:3000/api/nexus/health');
  if (!healthRes.ok) {
    throw new Error('Vite dev server relay is not accessible at http://localhost:3000');
  }
  const healthData = await healthRes.json();
  console.log('[1/7] Dev Relay Server Health Check: OK', healthData);

  // 2. Browser A (Bob) creates Room "444"
  // Creator Code: "5555", Guest Code: "2266"
  console.log('\n[2/7] Browser A (Bob) initializing room 444...');
  const roomCode = '444';
  const creatorCode = '5555';
  const guestCode = '2266';

  const roomSalt = generateSalt(16);
  const sessionSalt = generateSalt(16);
  const creatorVerifier = await computeAccessVerifier(creatorCode, roomSalt);
  const guestVerifier = await computeAccessVerifier(guestCode, roomSalt);

  const bobMasterKey = await generateRoomKey();
  const creatorKwk = await deriveKeyWrappingKey(`${roomCode}:${creatorCode}`, sessionSalt);
  const guestKwk = await deriveKeyWrappingKey(`${roomCode}:${guestCode}`, sessionSalt);

  const creatorWrapped = await wrapRoomMasterKey(bobMasterKey, creatorKwk);
  const guestWrapped = await wrapRoomMasterKey(bobMasterKey, guestKwk);

  const roomRecord = {
    id: 'room_' + Date.now(),
    room_code: roomCode,
    creator_id: 'user_bob',
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

  const createRes = await fetch('http://localhost:3000/api/nexus/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roomRecord),
  });
  if (!createRes.ok) {
    throw new Error(`Failed to create room on relay: ${createRes.statusText}`);
  }
  console.log('      Room 444 successfully published to relay.');

  // 3. Browser B (Lal - Incognito session) joins Room "444" with Guest Code "2266"
  console.log('\n[3/7] Browser B (Lal - Incognito session) joining room 444 with Guest Code 2266...');
  const lookupRes = await fetch(`http://localhost:3000/api/nexus/rooms/${roomCode}`);
  if (!lookupRes.ok) {
    throw new Error(`Browser B could not find room 444: ${lookupRes.status}`);
  }
  const { data: fetchedRoom } = await lookupRes.json();
  console.log('      Browser B fetched room metadata from server.');

  // Verify guest verifier
  const lalInputVerifier = await computeAccessVerifier(guestCode, fetchedRoom.room_salt);
  if (lalInputVerifier !== fetchedRoom.guest_access_verifier) {
    throw new Error('Browser B guest verifier mismatch!');
  }
  console.log('      [✓] Guest authorization verifier match: SUCCESS');

  // Derive KWK and unwrap master key
  const lalKwk = await deriveKeyWrappingKey(`${roomCode}:${guestCode}`, fetchedRoom.session_salt);
  const lalMasterKey = await unwrapRoomMasterKey(
    fetchedRoom.guest_wrapped_key,
    fetchedRoom.guest_key_iv,
    lalKwk
  );
  console.log('      [✓] Guest master key unwrapped: SUCCESS');

  // 4. Bob sends encrypted message to Lal
  console.log('\n[4/7] Bob transmits encrypted message: "STATUS: ALPHA NODE SECURE"');
  const bobPlaintext = 'STATUS: ALPHA NODE SECURE';
  const bobEncrypted = await encryptMessage(bobPlaintext, bobMasterKey);

  const msgPayload = {
    id: 'msg_01',
    room_id: fetchedRoom.id,
    user_id: 'user_bob',
    username: 'Bob',
    ciphertext: bobEncrypted.ciphertext,
    iv: bobEncrypted.iv,
    visual_shift_letter: 'B',
    created_at: new Date().toISOString(),
  };

  const sendRes = await fetch('http://localhost:3000/api/nexus/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_code: roomCode, message: msgPayload }),
  });
  if (!sendRes.ok) {
    throw new Error('Failed to send message to relay');
  }
  console.log('      Message successfully transmitted over wire.');

  // 5. Lal receives and decrypts Bob's message
  console.log('\n[5/7] Lal receives packet from server and decrypts...');
  const getMsgsRes = await fetch(`http://localhost:3000/api/nexus/messages?room=${roomCode}`);
  const { data: msgs } = await getMsgsRes.json();
  const latestMsg = msgs[msgs.length - 1];

  const lalDecrypted = await decryptMessage(latestMsg.ciphertext, latestMsg.iv, lalMasterKey);
  console.log(`      Lal decrypted plaintext: "${lalDecrypted}"`);
  if (lalDecrypted !== bobPlaintext) {
    throw new Error(`Decrypted message mismatch! Expected: ${bobPlaintext}, got: ${lalDecrypted}`);
  }
  console.log('      [✓] Bob -> Lal message verified: PASS');

  // 6. Lal transmits response to Bob
  console.log('\n[6/7] Lal transmits response: "BRAVO ACKNOWLEDGED // KEYWAYS MATCH"');
  const lalPlaintext = 'BRAVO ACKNOWLEDGED // KEYWAYS MATCH';
  const lalEncrypted = await encryptMessage(lalPlaintext, lalMasterKey);

  const responsePayload = {
    id: 'msg_02',
    room_id: fetchedRoom.id,
    user_id: 'user_lal',
    username: 'Lal',
    ciphertext: lalEncrypted.ciphertext,
    iv: lalEncrypted.iv,
    visual_shift_letter: 'L',
    created_at: new Date().toISOString(),
  };

  await fetch('http://localhost:3000/api/nexus/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_code: roomCode, message: responsePayload }),
  });

  const bobGetMsgs = await fetch(`http://localhost:3000/api/nexus/messages?room=${roomCode}`);
  const { data: bobMsgs } = await bobGetMsgs.json();
  const bobReceivedMsg = bobMsgs[bobMsgs.length - 1];
  const bobDecrypted = await decryptMessage(bobReceivedMsg.ciphertext, bobReceivedMsg.iv, bobMasterKey);
  console.log(`      Bob decrypted plaintext: "${bobDecrypted}"`);
  if (bobDecrypted !== lalPlaintext) {
    throw new Error(`Decrypted message mismatch! Expected: ${lalPlaintext}, got: ${bobDecrypted}`);
  }
  console.log('      [✓] Lal -> Bob response verified: PASS');

  // 7. Test invalid guest access code rejection
  console.log('\n[7/7] Testing security negative cases:');
  const wrongCode = '9999';
  const wrongVerifier = await computeAccessVerifier(wrongCode, fetchedRoom.room_salt);
  const isAuthorized = wrongVerifier === fetchedRoom.guest_access_verifier;
  console.log(`      Wrong Guest Code (9999) verification: ${isAuthorized ? 'ACCEPTED (FAIL)' : 'REJECTED (PASS)'}`);
  if (isAuthorized) {
    throw new Error('Security failure: invalid guest code was accepted!');
  }

  console.log('\n====================================================');
  console.log('ALL REAL-TIME TWO-PARTY E2EE VERIFICATION CHECKS PASSED');
  console.log('====================================================\n');
}

runLiveE2ETest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
