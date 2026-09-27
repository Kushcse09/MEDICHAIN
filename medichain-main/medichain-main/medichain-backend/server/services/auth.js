import { ethers } from "ethers";
import jwt from "jsonwebtoken";

// In-memory nonce store — swap for Redis/DB in production
const nonces = new Map();

export function generateNonce(address) {
  const nonce = `MediChain login nonce: ${Math.floor(Math.random() * 1e9)} @ ${Date.now()}`;
  nonces.set(address.toLowerCase(), nonce);
  return nonce;
}

/**
 * Verifies that `signature` is a valid signature of the previously-issued
 * nonce, signed by `address`'s private key. This proves wallet ownership
 * without ever handling a password.
 */
export function verifySignatureAndIssueToken(address, signature) {
  const key = address.toLowerCase();
  const nonce = nonces.get(key);
  if (!nonce) throw new Error("No nonce issued for this address — request one first");

  // Reconstruct the exact message the frontend signs (see lib/wallet.ts)
  const message = `MediChain Login Request\n\nNonce: ${nonce}\n\nSigning this message proves you own this wallet address and allows you to access your medical records.`;
  const recovered = ethers.verifyMessage(message, signature);
  if (recovered.toLowerCase() !== key) {
    throw new Error("Signature does not match address");
  }

  nonces.delete(key); // one-time use

  const token = jwt.sign({ address: key }, process.env.JWT_SECRET, { expiresIn: "12h" });
  return token;
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.wallet = payload.address;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
