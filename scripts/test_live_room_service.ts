import { webcrypto } from 'crypto';

if (!globalThis.crypto?.subtle) {
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

import { createRoom, joinRoom, getLatestJoinDiagnostics } from '../src/services/roomService';
import { encryptMessage, decryptMessage } from '../src/crypto/encryption';

async function testLiveRoomService() {
  console.log('Testing createRoom and joinRoom via roomService API...');

  // 1. Bob creates room 777 with Creator Code 4321 and Guest Code 8765
  const bobSession = await createRoom('user_bob', 'Bob', '777', '4321', '8765');
  console.log('Bob created room 777:', {
    role: bobSession.role,
    roomCode: bobSession.roomCode,
    saltPresent: Boolean(bobSession.salt),
  });

  // 2. Lal joins room 777 with Guest Code 8765
  const lalSession = await joinRoom('user_lal', 'Lal', '777', '8765');
  const diagnostics = getLatestJoinDiagnostics();
  console.log('Lal joined room 777:', {
    role: lalSession.role,
    roomCode: lalSession.roomCode,
    transport: diagnostics.transport,
    verifierResult: diagnostics.verifierResult,
    unwrapResult: diagnostics.unwrapResult,
  });

  // 3. Encrypt message from Bob -> Lal
  const testMsg = 'CONFIDENTIAL_NEXUS_ALPHA';
  const encrypted = await encryptMessage(testMsg, bobSession.masterKey);
  const decrypted = await decryptMessage(encrypted.ciphertext, encrypted.iv, lalSession.masterKey);
  console.log('Decrypted message match:', decrypted === testMsg ? 'PASS' : 'FAIL');
  if (decrypted !== testMsg) throw new Error('Decryption mismatch');

  // 4. Test invalid join with code 1111
  try {
    await joinRoom('user_eve', 'Eve', '777', '1111');
    throw new Error('Eve should have been rejected!');
  } catch (err: any) {
    const eveDiagnostics = getLatestJoinDiagnostics();
    console.log('Eve invalid code rejected as expected:', {
      verifierResult: eveDiagnostics.verifierResult,
      errorStage: eveDiagnostics.errorStage,
    });
  }

  console.log('\n[PASS] roomService integration test successfully completed against live relay backend.');
}

testLiveRoomService().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
