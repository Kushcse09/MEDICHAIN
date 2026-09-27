/**
 * MediChain Shield - Node.js AES-GCM Crypto Compat
 * 
 * Node.js-compatible implementation of the same AES-256-GCM encrypt/decrypt
 * used in lib/crypto/aesGcm.ts (which uses WebCrypto API, browser-only).
 * 
 * Used by stolen-cid.test.js and other backend tests that need to demonstrate
 * the crypto properties without a browser environment.
 */

import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

class AuthenticationError extends Error {
  constructor() {
    super("Authentication failed: ciphertext modified or wrong key/AAD");
    this.name = "TamperDetectedError";
  }
}

/**
 * Encrypts plaintext with AES-256-GCM, binding recordId as AAD.
 * Mirrors lib/crypto/aesGcm.ts encryptRecord() semantics.
 */
export async function encryptRecord(plaintext, recordId) {
  if (!plaintext || plaintext.length === 0) throw new Error("Plaintext cannot be empty");
  if (!recordId || String(recordId).trim().length === 0) throw new Error("Record ID cannot be empty");

  const recordKey = new Uint8Array(randomBytes(32));
  const iv = new Uint8Array(randomBytes(12));
  const aad = Buffer.from(recordId);

  const cipher = createCipheriv("aes-256-gcm", Buffer.from(recordKey), Buffer.from(iv));
  cipher.setAAD(aad);

  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Append auth tag (16 bytes) to ciphertext — same layout as WebCrypto
  const ciphertext = new Uint8Array(encrypted.length + tag.length);
  ciphertext.set(encrypted);
  ciphertext.set(tag, encrypted.length);

  return { ciphertext, iv, recordKey };
}

/**
 * Decrypts AES-256-GCM ciphertext produced by encryptRecord.
 * Throws TamperDetectedError if authentication fails (wrong key, wrong AAD, tampered).
 */
export async function decryptRecord(ciphertext, iv, recordKey, recordId) {
  if (!ciphertext || ciphertext.length === 0) throw new Error("Ciphertext cannot be empty");
  if (!iv || iv.length !== 12) throw new Error("Invalid IV: must be 12 bytes");
  if (!recordKey || recordKey.length !== 32) throw new Error("Invalid key: must be 32 bytes");
  if (!recordId || String(recordId).trim().length === 0) throw new Error("Record ID cannot be empty");

  // Split ciphertext from auth tag (last 16 bytes)
  const tagOffset = ciphertext.length - 16;
  const ciphertextBuf = Buffer.from(ciphertext.slice(0, tagOffset));
  const tagBuf = Buffer.from(ciphertext.slice(tagOffset));
  const aad = Buffer.from(recordId);

  try {
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(recordKey), Buffer.from(iv));
    decipher.setAuthTag(tagBuf);
    decipher.setAAD(aad);
    const plaintext = Buffer.concat([decipher.update(ciphertextBuf), decipher.final()]);
    return new Uint8Array(plaintext);
  } catch {
    throw new AuthenticationError();
  }
}
