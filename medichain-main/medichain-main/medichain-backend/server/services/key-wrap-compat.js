/**
 * MediChain Shield - Node.js Key Wrap Compat
 * 
 * Node.js-compatible implementation of lib/crypto/keyWrap.ts (which uses
 * libsodium-wrappers in browser/WASM mode). This shim uses libsodium-wrappers
 * directly in a Node.js ESM context.
 * 
 * Used by stolen-cid.test.js to demonstrate the X25519 sealed box wrap/unwrap
 * without TypeScript compilation.
 */

import sodium from "libsodium-wrappers";

await sodium.ready;

/**
 * Wraps (encrypts) a record key for a recipient using crypto_box_seal.
 * Mirrors lib/crypto/keyWrap.ts wrapKey().
 */
export async function wrapKey(recordKey, recipientPublicKey) {
  await sodium.ready;
  if (!recordKey || recordKey.length === 0) throw new Error("Record key cannot be empty");
  if (!recipientPublicKey || recipientPublicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
    throw new Error(`Invalid recipient public key: expected ${sodium.crypto_box_PUBLICKEYBYTES} bytes`);
  }
  return sodium.crypto_box_seal(recordKey, recipientPublicKey);
}

/**
 * Unwraps (decrypts) a sealed record key using recipient's keypair.
 * Mirrors lib/crypto/keyWrap.ts unwrapKey().
 */
export async function unwrapKey(sealedKey, recipientPublicKey, recipientPrivateKey) {
  await sodium.ready;
  if (!sealedKey || sealedKey.length === 0) throw new Error("Sealed key cannot be empty");
  return sodium.crypto_box_seal_open(sealedKey, recipientPublicKey, recipientPrivateKey);
}
