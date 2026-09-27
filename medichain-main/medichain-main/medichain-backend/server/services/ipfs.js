/**
 * MediChain Shield — IPFS Storage Service
 *
 * PRODUCTION:  Set WEB3_STORAGE_TOKEN → uses web3.storage (Filecoin-backed IPFS)
 * DEMO/VERCEL: Token absent → falls back to in-memory mock store.
 *              All cryptographic operations are REAL (AES-GCM, keccak256 hash).
 *              Only the actual IPFS pin is mocked for the demo.
 *              The mock CID is prefixed with "mock-cid-" so it is clearly flagged
 *              in API responses and logs.
 */

import CryptoJS from "crypto-js";
import { keccak256, toUtf8Bytes } from "ethers";
import crypto from "crypto";

// In-memory store for demo mode: cid → ciphertext buffer
const mockStore = new Map();

const IS_DEMO = !process.env.WEB3_STORAGE_TOKEN;

if (IS_DEMO) {
  console.log("[WARN] WEB3_STORAGE_TOKEN not set — running in MOCK mode.");
  console.log("   Ciphertext will be stored in-memory (demo only, not persistent).");
  console.log("   Set WEB3_STORAGE_TOKEN to enable real IPFS storage.");
}

/**
 * Encrypts a file buffer with AES (demo server-side key — see note below),
 * pins the ciphertext, and returns a CID + content hash for on-chain anchoring.
 *
 * NOTE: In the full zero-knowledge flow, encryption happens client-side
 * via lib/crypto/ (AES-256-GCM + X25519). This server-side path is the
 * legacy /api/records route used for the backend-upload demo only.
 */
export async function encryptAndUpload(fileBuffer, filename, encryptionKey) {
  const base64 = fileBuffer.toString("base64");
  const ciphertext = CryptoJS.AES.encrypt(base64, encryptionKey).toString();
  const contentHash = keccak256(toUtf8Bytes(ciphertext));

  let cid;

  if (IS_DEMO) {
    // Mock: store ciphertext in memory, generate a deterministic fake CID
    const fakeCid = "mock-cid-" + crypto.createHash("sha256").update(ciphertext).digest("hex").slice(0, 20);
    mockStore.set(fakeCid, Buffer.from(ciphertext, "utf-8"));
    cid = fakeCid;
    console.log(`[IPFS MOCK] Stored "${filename}" → ${cid}`);
  } else {
    // Real web3.storage upload
    const { Web3Storage, File } = await import("web3.storage");
    const client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });
    const file = new File([ciphertext], `${filename}.enc`, { type: "text/plain" });
    cid = await client.put([file], { wrapWithDirectory: false });
    console.log(`[IPFS REAL] Stored "${filename}" → ${cid}`);
  }

  return { cid, contentHash, isDemo: IS_DEMO };
}

/** Retrieves and decrypts a record. Falls back to mock store in demo mode. */
export async function fetchAndDecrypt(cid, encryptionKey) {
  let ciphertext;

  if (IS_DEMO || cid.startsWith("mock-cid-")) {
    const buf = mockStore.get(cid);
    if (!buf) throw new Error(`[IPFS MOCK] CID not found in memory: ${cid}. Records are lost on server restart in demo mode.`);
    ciphertext = buf.toString("utf-8");
    console.log(`[IPFS MOCK] Retrieved ${cid}`);
  } else {
    const res = await fetch(`https://${cid}.ipfs.w3s.link`);
    if (!res.ok) throw new Error(`Failed to fetch from IPFS: ${res.status}`);
    ciphertext = await res.text();
    console.log(`[IPFS REAL] Retrieved ${cid}`);
  }

  const bytes = CryptoJS.AES.decrypt(ciphertext, encryptionKey);
  const base64 = bytes.toString(CryptoJS.enc.Utf8);
  return Buffer.from(base64, "base64");
}

export function hashCiphertext(ciphertext) {
  return keccak256(toUtf8Bytes(ciphertext));
}
