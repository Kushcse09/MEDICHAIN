/**
 * MediChain Shield - Cryptographic Engine Test Suite
 * 
 * Comprehensive tests for all cryptographic primitives:
 * - Key derivation from wallet signatures
 * - AES-256-GCM encryption/decryption
 * - AAD binding and tamper detection
 * - Key wrapping/unwrapping
 * - IV uniqueness
 * - Error handling
 * 
 * Target: 100% code coverage for crypto module
 */

import { describe, it, expect, beforeAll } from 'vitest';
import sodium from 'libsodium-wrappers';

import {
  deriveX25519KeyPair,
  generateKeyDerivationMessage,
  isValidX25519PublicKey,
  keyToHex,
  hexToKey,
  zeroize,
  SecureKeyPair,
} from './keyDerivation';

import {
  encryptRecord,
  decryptRecord,
  encryptText,
  decryptText,
  generateRecordKey,
  generateIV,
  sha256,
  sha256Hex,
  TamperDetectedError,
} from './aesGcm';

import {
  wrapKey,
  unwrapKey,
  wrapKeyForMultiple,
  wrappedKeyToBase64,
  base64ToWrappedKey,
  getSealedSize,
  isValidSealedKeySize,
} from './keyWrap';

import {
  encryptRecordForRecipients,
  decryptSharedRecord,
} from './index';

// Test fixtures
const TEST_CHAIN_ID = 11155111; // Ethereum Sepolia
const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const TEST_SIGNATURE =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';
const TEST_RECORD_ID = 'record-123';

beforeAll(async () => {
  await sodium.ready;
});

describe('Key Derivation', () => {
  it('should generate deterministic EIP-191 message', () => {
    const message = generateKeyDerivationMessage(TEST_CHAIN_ID, TEST_ADDRESS);
    expect(message).toContain('MediChain Shield Identity Key v1');
    expect(message).toContain(`Chain ID: ${TEST_CHAIN_ID}`);
    expect(message).toContain(TEST_ADDRESS.toLowerCase());
  });

  it('should derive X25519 keypair from signature', async () => {
    const keypair = await deriveX25519KeyPair(TEST_SIGNATURE, TEST_CHAIN_ID, TEST_ADDRESS);

    expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
    expect(keypair.privateKey).toBeInstanceOf(Uint8Array);
    expect(keypair.publicKey.length).toBe(32);
    expect(keypair.privateKey.length).toBe(32);
  });

  it('should derive same keypair from same signature', async () => {
    const keypair1 = await deriveX25519KeyPair(TEST_SIGNATURE, TEST_CHAIN_ID, TEST_ADDRESS);
    const keypair2 = await deriveX25519KeyPair(TEST_SIGNATURE, TEST_CHAIN_ID, TEST_ADDRESS);

    expect(keypair1.publicKey).toEqual(keypair2.publicKey);
    expect(keypair1.privateKey).toEqual(keypair2.privateKey);
  });

  it('should derive different keypairs for different signatures', async () => {
    const sig2 =
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

    const keypair1 = await deriveX25519KeyPair(TEST_SIGNATURE, TEST_CHAIN_ID, TEST_ADDRESS);
    const keypair2 = await deriveX25519KeyPair(sig2, TEST_CHAIN_ID, TEST_ADDRESS);

    expect(keypair1.publicKey).not.toEqual(keypair2.publicKey);
    expect(keypair1.privateKey).not.toEqual(keypair2.privateKey);
  });

  it('should derive different keypairs for different chain IDs', async () => {
    const keypair1 = await deriveX25519KeyPair(TEST_SIGNATURE, TEST_CHAIN_ID, TEST_ADDRESS);
    const keypair2 = await deriveX25519KeyPair(TEST_SIGNATURE, 137, TEST_ADDRESS); // Polygon mainnet

    expect(keypair1.publicKey).not.toEqual(keypair2.publicKey);
    expect(keypair1.privateKey).not.toEqual(keypair2.privateKey);
  });

  it('should reject invalid signature length', async () => {
    await expect(
      deriveX25519KeyPair('0x1234', TEST_CHAIN_ID, TEST_ADDRESS)
    ).rejects.toThrow('Invalid signature length');
  });

  it('should validate X25519 public keys', () => {
    const validKey = new Uint8Array(32);
    const invalidKey = new Uint8Array(16);

    expect(isValidX25519PublicKey(validKey)).toBe(true);
    expect(isValidX25519PublicKey(invalidKey)).toBe(false);
  });

  it('should convert keys to/from hex', () => {
    const key = new Uint8Array([0xab, 0xcd, 0xef, 0x01, 0x23]);
    const hex = keyToHex(key);

    expect(hex).toBe('0xabcdef0123');

    const restored = hexToKey(hex);
    expect(restored).toEqual(key);
  });

  it('should zeroize buffers', () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5]);
    zeroize(buffer);

    // Buffer should be all zeros after overwrite
    expect(buffer.every((b) => b === 0)).toBe(true);
  });

  it('should handle SecureKeyPair lifecycle', async () => {
    const rawKeypair = await deriveX25519KeyPair(TEST_SIGNATURE, TEST_CHAIN_ID, TEST_ADDRESS);
    const secureKeypair = new SecureKeyPair(rawKeypair);

    // Should be accessible before wipe
    expect(secureKeypair.publicKey).toBeInstanceOf(Uint8Array);
    expect(secureKeypair.privateKey).toBeInstanceOf(Uint8Array);

    // Wipe keys
    secureKeypair.wipe();

    // Should throw after wipe
    expect(() => secureKeypair.publicKey).toThrow('Key has been wiped');
    expect(() => secureKeypair.privateKey).toThrow('Key has been wiped');
  });
});

describe('AES-GCM Encryption', () => {
  it('should generate random record keys', () => {
    const key1 = generateRecordKey();
    const key2 = generateRecordKey();

    expect(key1.length).toBe(32); // 256 bits
    expect(key2.length).toBe(32);
    expect(key1).not.toEqual(key2); // Should be random
  });

  it('should generate random IVs', () => {
    const iv1 = generateIV();
    const iv2 = generateIV();

    expect(iv1.length).toBe(12); // 96 bits
    expect(iv2.length).toBe(12);
    expect(iv1).not.toEqual(iv2); // Should be random
  });

  it('should encrypt and decrypt record successfully', async () => {
    const plaintext = new TextEncoder().encode('Patient medical record data');
    const encrypted = await encryptRecord(plaintext, TEST_RECORD_ID);

    expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
    expect(encrypted.iv).toBeInstanceOf(Uint8Array);
    expect(encrypted.recordKey).toBeInstanceOf(Uint8Array);
    expect(encrypted.ciphertext.length).toBeGreaterThan(0);

    const decrypted = await decryptRecord(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.recordKey,
      TEST_RECORD_ID
    );

    expect(decrypted).toEqual(plaintext);
  });

  it('should encrypt same plaintext to different ciphertext (due to random IV)', async () => {
    const plaintext = new TextEncoder().encode('Same data');

    const encrypted1 = await encryptRecord(plaintext, TEST_RECORD_ID);
    const encrypted2 = await encryptRecord(plaintext, TEST_RECORD_ID);

    // Different IVs should produce different ciphertexts
    expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
    expect(encrypted1.iv).not.toEqual(encrypted2.iv);
  });

  it('should detect tampered ciphertext', async () => {
    const plaintext = new TextEncoder().encode('Original data');
    const encrypted = await encryptRecord(plaintext, TEST_RECORD_ID);

    // Tamper with ciphertext
    encrypted.ciphertext[0] ^= 0xff;

    await expect(
      decryptRecord(encrypted.ciphertext, encrypted.iv, encrypted.recordKey, TEST_RECORD_ID)
    ).rejects.toThrow(TamperDetectedError);
  });

  it('should reject wrong record ID (AAD mismatch)', async () => {
    const plaintext = new TextEncoder().encode('Secret data');
    const encrypted = await encryptRecord(plaintext, TEST_RECORD_ID);

    await expect(
      decryptRecord(encrypted.ciphertext, encrypted.iv, encrypted.recordKey, 'wrong-record-id')
    ).rejects.toThrow(TamperDetectedError);
  });

  it('should reject wrong decryption key', async () => {
    const plaintext = new TextEncoder().encode('Encrypted data');
    const encrypted = await encryptRecord(plaintext, TEST_RECORD_ID);

    const wrongKey = generateRecordKey();

    await expect(
      decryptRecord(encrypted.ciphertext, encrypted.iv, wrongKey, TEST_RECORD_ID)
    ).rejects.toThrow(TamperDetectedError);
  });

  it('should reject invalid IV length', async () => {
    const ciphertext = new Uint8Array(32);
    const key = generateRecordKey();
    const invalidIV = new Uint8Array(8); // Wrong size

    await expect(
      decryptRecord(ciphertext, invalidIV, key, TEST_RECORD_ID)
    ).rejects.toThrow('Invalid IV');
  });

  it('should reject empty plaintext', async () => {
    await expect(encryptRecord(new Uint8Array(0), TEST_RECORD_ID)).rejects.toThrow(
      'Plaintext cannot be empty'
    );
  });

  it('should reject empty record ID', async () => {
    const plaintext = new TextEncoder().encode('Data');
    await expect(encryptRecord(plaintext, '')).rejects.toThrow('Record ID cannot be empty');
  });

  it('should encrypt and decrypt text convenience functions', async () => {
    const plaintext = 'Hello, MediChain!';
    const encrypted = await encryptText(plaintext, TEST_RECORD_ID);

    expect(typeof encrypted.ciphertext).toBe('string');
    expect(typeof encrypted.iv).toBe('string');
    expect(typeof encrypted.key).toBe('string');

    const decrypted = await decryptText(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.key,
      TEST_RECORD_ID
    );

    expect(decrypted).toBe(plaintext);
  });

  it('should compute SHA-256 hash', async () => {
    const data = new TextEncoder().encode('test data');
    const hash = await sha256(data);

    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32); // 256 bits

    // Should be deterministic
    const hash2 = await sha256(data);
    expect(hash).toEqual(hash2);
  });

  it('should compute SHA-256 hash as hex', async () => {
    const data = new TextEncoder().encode('test data');
    const hash = await sha256Hex(data);

    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('should ensure IV uniqueness (statistical test)', async () => {
    const ivs = new Set<string>();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const iv = generateIV();
      const ivHex = Array.from(iv)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      ivs.add(ivHex);
    }

    // All IVs should be unique (collision probability < 2^-64 for 2^32 encryptions)
    expect(ivs.size).toBe(iterations);
  });
});

describe('Key Wrapping', () => {
  it('should wrap and unwrap key successfully', async () => {
    const recordKey = generateRecordKey();
    const recipientKeypair = sodium.crypto_box_keypair();

    const wrapped = await wrapKey(recordKey, recipientKeypair.publicKey);

    expect(wrapped).toBeInstanceOf(Uint8Array);
    expect(wrapped.length).toBeGreaterThan(recordKey.length); // Includes overhead

    const unwrapped = await unwrapKey(
      wrapped,
      recipientKeypair.publicKey,
      recipientKeypair.privateKey
    );

    expect(unwrapped).toEqual(recordKey);
  });

  it('should reject unwrapping with wrong private key', async () => {
    const recordKey = generateRecordKey();
    const recipient1 = sodium.crypto_box_keypair();
    const recipient2 = sodium.crypto_box_keypair();

    const wrapped = await wrapKey(recordKey, recipient1.publicKey);

    await expect(
      unwrapKey(wrapped, recipient2.publicKey, recipient2.privateKey)
    ).rejects.toThrow('Key unwrapping failed');
  });

  it('should reject tampered wrapped key', async () => {
    const recordKey = generateRecordKey();
    const recipientKeypair = sodium.crypto_box_keypair();

    const wrapped = await wrapKey(recordKey, recipientKeypair.publicKey);

    // Tamper with wrapped key
    wrapped[0] ^= 0xff;

    await expect(
      unwrapKey(wrapped, recipientKeypair.publicKey, recipientKeypair.privateKey)
    ).rejects.toThrow('Key unwrapping failed');
  });

  it('should wrap key for multiple recipients', async () => {
    const recordKey = generateRecordKey();
    const recipient1 = sodium.crypto_box_keypair();
    const recipient2 = sodium.crypto_box_keypair();
    const recipient3 = sodium.crypto_box_keypair();

    const wrapped = await wrapKeyForMultiple(recordKey, [
      recipient1.publicKey,
      recipient2.publicKey,
      recipient3.publicKey,
    ]);

    expect(wrapped.length).toBe(3);

    // Each recipient can unwrap
    const unwrapped1 = await unwrapKey(
      wrapped[0],
      recipient1.publicKey,
      recipient1.privateKey
    );
    const unwrapped2 = await unwrapKey(
      wrapped[1],
      recipient2.publicKey,
      recipient2.privateKey
    );
    const unwrapped3 = await unwrapKey(
      wrapped[2],
      recipient3.publicKey,
      recipient3.privateKey
    );

    expect(unwrapped1).toEqual(recordKey);
    expect(unwrapped2).toEqual(recordKey);
    expect(unwrapped3).toEqual(recordKey);
  });

  it('should convert wrapped key to/from base64', () => {
    const wrapped = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const base64 = wrappedKeyToBase64(wrapped);

    expect(typeof base64).toBe('string');

    const restored = base64ToWrappedKey(base64);
    expect(restored).toEqual(wrapped);
  });

  it('should calculate sealed size correctly', () => {
    const keySize = 32;
    const sealedSize = getSealedSize(keySize);

    expect(sealedSize).toBe(sodium.crypto_box_SEALBYTES + keySize);
  });

  it('should validate sealed key size', async () => {
    const recordKey = generateRecordKey();
    const recipientKeypair = sodium.crypto_box_keypair();

    const wrapped = await wrapKey(recordKey, recipientKeypair.publicKey);

    expect(isValidSealedKeySize(wrapped)).toBe(true);
    expect(isValidSealedKeySize(wrapped, recordKey.length)).toBe(true);

    const tooSmall = new Uint8Array(10);
    expect(isValidSealedKeySize(tooSmall)).toBe(false);
  });

  it('should reject wrapping with invalid public key', async () => {
    const recordKey = generateRecordKey();
    const invalidKey = new Uint8Array(16); // Wrong size

    await expect(wrapKey(recordKey, invalidKey)).rejects.toThrow('Invalid recipient public key');
  });

  it('should reject unwrapping with invalid keys', async () => {
    const wrapped = new Uint8Array(48);
    const invalidPublicKey = new Uint8Array(16);
    const invalidPrivateKey = new Uint8Array(16);
    const validKey = new Uint8Array(32);

    await expect(unwrapKey(wrapped, invalidPublicKey, validKey)).rejects.toThrow(
      'Invalid recipient public key'
    );

    await expect(unwrapKey(wrapped, validKey, invalidPrivateKey)).rejects.toThrow(
      'Invalid recipient private key'
    );
  });
});

describe('Complete Encryption Flows', () => {
  it('should encrypt record for multiple recipients and decrypt', async () => {
    const plaintext = new TextEncoder().encode('Confidential medical record');
    const recipient1 = await deriveX25519KeyPair(TEST_SIGNATURE, TEST_CHAIN_ID, TEST_ADDRESS);
    const recipient2 = sodium.crypto_box_keypair();

    const encrypted = await encryptRecordForRecipients(plaintext, TEST_RECORD_ID, [
      recipient1.publicKey,
      recipient2.publicKey,
    ]);

    expect(encrypted.wrappedKeys.length).toBe(2);

    // Recipient 1 can decrypt
    const decrypted1 = await decryptSharedRecord(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.wrappedKeys[0],
      recipient1.publicKey,
      recipient1.privateKey,
      TEST_RECORD_ID
    );

    expect(decrypted1).toEqual(plaintext);

    // Recipient 2 can decrypt
    const decrypted2 = await decryptSharedRecord(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.wrappedKeys[1],
      recipient2.publicKey,
      recipient2.privateKey,
      TEST_RECORD_ID
    );

    expect(decrypted2).toEqual(plaintext);
  });

  it('should prevent cross-record ciphertext replay', async () => {
    const plaintext = new TextEncoder().encode('Record data');
    const recipientKeypair = sodium.crypto_box_keypair();

    const encrypted1 = await encryptRecordForRecipients(plaintext, 'record-1', [
      recipientKeypair.publicKey,
    ]);

    // Try to decrypt with wrong record ID
    await expect(
      decryptSharedRecord(
        encrypted1.ciphertext,
        encrypted1.iv,
        encrypted1.wrappedKeys[0],
        recipientKeypair.publicKey,
        recipientKeypair.privateKey,
        'record-2' // Wrong record ID
      )
    ).rejects.toThrow(TamperDetectedError);
  });

  it('should handle end-to-end encryption workflow', async () => {
    // Patient creates record
    const patientKeypair = await deriveX25519KeyPair(TEST_SIGNATURE, TEST_CHAIN_ID, TEST_ADDRESS);
    const doctorKeypair = sodium.crypto_box_keypair();

    const medicalData = new TextEncoder().encode(
      JSON.stringify({
        patientId: 'P12345',
        diagnosis: 'Hypertension',
        medications: ['Lisinopril 10mg'],
        timestamp: '2024-01-15T10:30:00Z',
      })
    );

    // 1. Encrypt for patient and doctor
    const encrypted = await encryptRecordForRecipients(medicalData, TEST_RECORD_ID, [
      patientKeypair.publicKey,
      doctorKeypair.publicKey,
    ]);

    // 2. Patient can access their own record
    const patientView = await decryptSharedRecord(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.wrappedKeys[0],
      patientKeypair.publicKey,
      patientKeypair.privateKey,
      TEST_RECORD_ID
    );

    expect(new TextDecoder().decode(patientView)).toContain('Hypertension');

    // 3. Doctor can access shared record
    const doctorView = await decryptSharedRecord(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.wrappedKeys[1],
      doctorKeypair.publicKey,
      doctorKeypair.privateKey,
      TEST_RECORD_ID
    );

    expect(new TextDecoder().decode(doctorView)).toContain('Lisinopril');

    // 4. Unauthorized third party cannot decrypt (no wrapped key)
    const attackerKeypair = sodium.crypto_box_keypair();
    await expect(
      unwrapKey(encrypted.wrappedKeys[0], attackerKeypair.publicKey, attackerKeypair.privateKey)
    ).rejects.toThrow();
  });
});
