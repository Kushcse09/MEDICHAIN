/**
 * MediChain Shield - Storage Service
 * 
 * Multi-adapter storage interface for encrypted record ciphertext:
 * - Primary: Kubo IPFS HTTP API (local node)
 * - Secondary: In-memory/filesystem mock (for testing)
 * - Validation: Ensures only ciphertext is stored (no plaintext)
 * 
 * Security: All storage adapters refuse unencrypted payloads
 */

import { create as createIPFSClient } from "ipfs-http-client";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

/**
 * Storage adapter interface
 */
class StorageAdapter {
  async store(data) {
    throw new Error("Not implemented");
  }

  async retrieve(cid) {
    throw new Error("Not implemented");
  }

  async pin(cid) {
    throw new Error("Not implemented");
  }
}

/**
 * IPFS Kubo HTTP adapter
 * Connects to local Kubo node via HTTP API
 */
class IPFSKuboAdapter extends StorageAdapter {
  constructor(options = {}) {
    super();
    const { url = "http://127.0.0.1:5001" } = options;

    try {
      this.client = createIPFSClient({ url });
      this.available = true;
    } catch (error) {
      console.warn("[WARN] IPFS Kubo adapter initialization failed:", error.message);
      this.available = false;
    }
  }

  async store(data) {
    if (!this.available) {
      throw new Error("IPFS Kubo adapter not available");
    }

    try {
      const result = await this.client.add(data, {
        pin: true,
        cidVersion: 1,
      });
      return result.cid.toString();
    } catch (error) {
      throw new Error(`IPFS storage failed: ${error.message}`);
    }
  }

  async retrieve(cid) {
    if (!this.available) {
      throw new Error("IPFS Kubo adapter not available");
    }

    try {
      const chunks = [];
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`IPFS retrieval failed: ${error.message}`);
    }
  }

  async pin(cid) {
    if (!this.available) {
      throw new Error("IPFS Kubo adapter not available");
    }

    try {
      await this.client.pin.add(cid);
      return true;
    } catch (error) {
      throw new Error(`IPFS pinning failed: ${error.message}`);
    }
  }
}

/**
 * In-memory storage adapter
 * For testing and development without IPFS
 */
class InMemoryAdapter extends StorageAdapter {
  constructor() {
    super();
    this.storage = new Map();
    this.available = true;
  }

  async store(data) {
    // Generate content-addressed CID (simplified)
    const hash = crypto.createHash("sha256").update(data).digest("hex");
    const cid = `Qm${hash.substring(0, 44)}`; // Mock CID format

    this.storage.set(cid, Buffer.from(data));
    return cid;
  }

  async retrieve(cid) {
    const data = this.storage.get(cid);
    if (!data) {
      throw new Error(`Content not found: ${cid}`);
    }
    return data;
  }

  async pin(cid) {
    // No-op for in-memory
    return this.storage.has(cid);
  }

  clear() {
    this.storage.clear();
  }
}

/**
 * Filesystem storage adapter
 * Stores content in local directory with content-addressed filenames
 */
class FilesystemAdapter extends StorageAdapter {
  constructor(options = {}) {
    super();
    this.storageDir = options.dir || "./data/ipfs-mock";
    this.available = true;
  }

  async _ensureDir() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }

  async store(data) {
    await this._ensureDir();

    // Generate content-addressed CID
    const hash = crypto.createHash("sha256").update(data).digest("hex");
    const cid = `Qm${hash.substring(0, 44)}`;

    const filePath = path.join(this.storageDir, cid);
    await fs.writeFile(filePath, data);

    return cid;
  }

  async retrieve(cid) {
    const filePath = path.join(this.storageDir, cid);
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new Error(`Content not found: ${cid}`);
    }
  }

  async pin(cid) {
    const filePath = path.join(this.storageDir, cid);
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Shield Storage Service
 * Orchestrates storage adapters with validation and fallback
 */
class ShieldStorage {
  constructor(options = {}) {
    const {
      primaryAdapter = "ipfs",
      ipfsUrl,
      storageDir,
      validateCiphertext = true,
    } = options;

    this.validateCiphertext = validateCiphertext;

    // Initialize adapters based on preference
    if (primaryAdapter === "ipfs") {
      this.primary = new IPFSKuboAdapter({ url: ipfsUrl });
      this.fallback = new InMemoryAdapter();
    } else if (primaryAdapter === "filesystem") {
      this.primary = new FilesystemAdapter({ dir: storageDir });
      this.fallback = new InMemoryAdapter();
    } else {
      this.primary = new InMemoryAdapter();
      this.fallback = null;
    }

    console.log(`Shield Storage initialized (primary: ${primaryAdapter})`);
  }

  /**
   * Validates that content is encrypted (basic heuristic check)
   */
  _validateCiphertext(data) {
    if (!this.validateCiphertext) return true;

    // Check for common plaintext indicators
    const str = data.toString("utf8", 0, Math.min(100, data.length));

    // Reject if looks like JSON, XML, or has too many printable ASCII
    if (str.startsWith("{") || str.startsWith("[") || str.startsWith("<")) {
      return false;
    }

    // Count non-printable characters (encrypted data should have high entropy)
    const nonPrintable = [...str].filter(
      (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126
    ).length;

    const nonPrintableRatio = nonPrintable / str.length;

    // Encrypted data should have > 40% non-printable chars
    return nonPrintableRatio > 0.4;
  }

  /**
   * Stores encrypted ciphertext
   * @param {Buffer|Uint8Array} data - Ciphertext to store
   * @param {object} metadata - Optional metadata (not stored, for logging)
   * @returns {string} IPFS CID
   */
  async storeCiphertext(data, metadata = {}) {
    const buffer = Buffer.from(data);

    // Validate it's ciphertext
    if (this.validateCiphertext && !this._validateCiphertext(buffer)) {
      throw new Error(
        "Rejected: Data appears to be unencrypted. Only ciphertext can be stored."
      );
    }

    try {
      // Try primary adapter
      if (this.primary.available) {
        const cid = await this.primary.store(buffer);
        console.log(`Stored ciphertext: ${cid} (${buffer.length} bytes)`);
        return cid;
      }

      // Fall back to secondary
      if (this.fallback && this.fallback.available) {
        const cid = await this.fallback.store(buffer);
        console.warn(`[WARN] Used fallback storage: ${cid}`);
        return cid;
      }

      throw new Error("No storage adapter available");
    } catch (error) {
      console.error("Storage failed:", error.message);
      throw error;
    }
  }

  /**
   * Retrieves ciphertext by CID
   * @param {string} cid - IPFS CID
   * @returns {Buffer} Ciphertext
   */
  async retrieveCiphertext(cid) {
    try {
      // Try primary adapter
      if (this.primary.available) {
        return await this.primary.retrieve(cid);
      }

      // Fall back to secondary
      if (this.fallback && this.fallback.available) {
        return await this.fallback.retrieve(cid);
      }

      throw new Error("No storage adapter available");
    } catch (error) {
      console.error(`Retrieval failed for ${cid}:`, error.message);
      throw error;
    }
  }

  /**
   * Pins content to ensure persistence
   * @param {string} cid - IPFS CID
   * @returns {boolean} Success
   */
  async pin(cid) {
    try {
      if (this.primary.available) {
        return await this.primary.pin(cid);
      }
      return false;
    } catch (error) {
      console.error(`Pinning failed for ${cid}:`, error.message);
      return false;
    }
  }

  /**
   * Gets storage adapter status
   */
  getStatus() {
    return {
      primary: {
        type: this.primary.constructor.name,
        available: this.primary.available,
      },
      fallback: this.fallback
        ? {
            type: this.fallback.constructor.name,
            available: this.fallback.available,
          }
        : null,
    };
  }
}

/**
 * Factory function to create storage instance
 */
export function createShieldStorage(options = {}) {
  return new ShieldStorage(options);
}

/**
 * Singleton instance (can be configured via env)
 */
let instance = null;

export function getShieldStorage() {
  if (!instance) {
    instance = createShieldStorage({
      primaryAdapter: process.env.STORAGE_ADAPTER || "ipfs",
      ipfsUrl: process.env.IPFS_URL || "http://127.0.0.1:5001",
      storageDir: process.env.STORAGE_DIR || "./data/ipfs-mock",
      validateCiphertext: process.env.VALIDATE_CIPHERTEXT !== "false",
    });
  }
  return instance;
}

export default ShieldStorage;
