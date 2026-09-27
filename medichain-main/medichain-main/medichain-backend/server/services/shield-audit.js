/**
 * MediChain Shield - Audit Service
 * 
 * Queries on-chain events from AccessRegistry to build audit trails:
 * - Chunked block querying (respects RPC limits)
 * - Event caching to reduce redundant queries
 * - Filtered event retrieval by record ID
 * - Human-readable event formatting
 */

import { ethers } from "ethers";
import fs from "fs/promises";
import path from "path";

/**
 * Audit Service for querying AccessRegistry events
 */
class ShieldAuditService {
  constructor(options = {}) {
    const {
      rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545",
      contractAddress,
      contractABI,
      maxBlockRange = 2000, // Max blocks per query (Amoy limit)
    } = options;

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.maxBlockRange = maxBlockRange;
    this.eventCache = new Map();

    // Load contract
    if (contractAddress && contractABI) {
      this.contract = new ethers.Contract(
        contractAddress,
        contractABI,
        this.provider
      );
    } else {
      console.warn("[WARN] Audit service: Contract not configured");
    }
  }

  /**
   * Loads contract configuration from auto-generated file
   */
  async loadContractConfig() {
    try {
      const configPath = path.join(
        process.cwd(),
        "config",
        "contracts.json"
      );
      const config = JSON.parse(await fs.readFile(configPath, "utf8"));

      if (config.AccessRegistry) {
        this.contract = new ethers.Contract(
          config.AccessRegistry.address,
          config.AccessRegistry.abi,
          this.provider
        );
        console.log(
          `Audit service connected to AccessRegistry at ${config.AccessRegistry.address}`
        );
      }
    } catch (error) {
      console.error("Failed to load contract config:", error.message);
    }
  }

  /**
   * Queries events in chunks to respect RPC block range limits
   */
  async *_queryEventsChunked(eventFilter, fromBlock, toBlock) {
    let currentBlock = fromBlock;

    while (currentBlock <= toBlock) {
      const endBlock = Math.min(currentBlock + this.maxBlockRange - 1, toBlock);

      try {
        const events = await this.contract.queryFilter(
          eventFilter,
          currentBlock,
          endBlock
        );

        yield* events;

        // Cache block range
        const cacheKey = `${eventFilter.fragment.name}:${currentBlock}-${endBlock}`;
        this.eventCache.set(cacheKey, events);
      } catch (error) {
        console.error(
          `Error querying blocks ${currentBlock}-${endBlock}:`,
          error.message
        );
      }

      currentBlock = endBlock + 1;
    }
  }

  /**
   * Formats event into human-readable audit entry
   */
  _formatEvent(event) {
    const { eventName, args, blockNumber, transactionHash } = event;

    const base = {
      event: eventName,
      blockNumber,
      transactionHash,
      timestamp: null, // Will be populated if block is fetched
    };

    switch (eventName) {
      case "PublicKeyPublished":
        return {
          ...base,
          account: args.account,
          publicKey: args.publicKey,
        };

      case "RecordRegistered":
        return {
          ...base,
          recordId: args.recordId,
          owner: args.owner,
        };

      case "AccessGranted":
        return {
          ...base,
          recordId: args.recordId,
          owner: args.owner,
          grantee: args.grantee,
          expiry: Number(args.expiry),
          wrappedKeyCid: args.wrappedKeyCid,
        };

      case "AccessRevoked":
        return {
          ...base,
          recordId: args.recordId,
          owner: args.owner,
          grantee: args.grantee,
        };

      case "AccessLogged":
        return {
          ...base,
          recordId: args.recordId,
          accessor: args.accessor,
        };

      default:
        return { ...base, args: Object.fromEntries(Object.entries(args)) };
    }
  }

  /**
   * Gets audit trail for a specific record
   */
  async getRecordAudit(recordId, options = {}) {
    if (!this.contract) {
      await this.loadContractConfig();
      if (!this.contract) {
        throw new Error("Contract not configured");
      }
    }

    const {
      fromBlock = 0,
      toBlock = "latest",
      includeTimestamps = true,
    } = options;

    const resolvedToBlock =
      toBlock === "latest" ? await this.provider.getBlockNumber() : toBlock;

    // Query all event types for this record
    const eventTypes = [
      "RecordRegistered",
      "AccessGranted",
      "AccessRevoked",
      "AccessLogged",
    ];

    const allEvents = [];

    for (const eventType of eventTypes) {
      const filter = this.contract.filters[eventType](recordId);

      for await (const event of this._queryEventsChunked(
        filter,
        fromBlock,
        resolvedToBlock
      )) {
        const formatted = this._formatEvent(event);

        // Optionally fetch block timestamp
        if (includeTimestamps) {
          try {
            const block = await this.provider.getBlock(event.blockNumber);
            formatted.timestamp = Number(block.timestamp);
          } catch (error) {
            console.warn(
              `Failed to fetch block ${event.blockNumber}:`,
              error.message
            );
          }
        }

        allEvents.push(formatted);
      }
    }

    // Sort by block number
    allEvents.sort((a, b) => a.blockNumber - b.blockNumber);

    return {
      recordId,
      totalEvents: allEvents.length,
      events: allEvents,
      queriedBlocks: {
        from: fromBlock,
        to: resolvedToBlock,
      },
    };
  }

  /**
   * Gets all events for a specific address
   */
  async getAddressActivity(address, options = {}) {
    if (!this.contract) {
      await this.loadContractConfig();
      if (!this.contract) {
        throw new Error("Contract not configured");
      }
    }

    const { fromBlock = 0, toBlock = "latest" } = options;

    const resolvedToBlock =
      toBlock === "latest" ? await this.provider.getBlockNumber() : toBlock;

    const allEvents = [];

    // Query events where address is owner, grantee, or accessor
    const eventQueries = [
      { name: "PublicKeyPublished", filter: [address] },
      { name: "RecordRegistered", filter: [null, address] },
      { name: "AccessGranted", filter: [null, address] }, // As owner
      { name: "AccessGranted", filter: [null, null, address] }, // As grantee
      { name: "AccessRevoked", filter: [null, address] }, // As owner
      { name: "AccessRevoked", filter: [null, null, address] }, // As grantee
      { name: "AccessLogged", filter: [null, address] },
    ];

    for (const { name, filter } of eventQueries) {
      const eventFilter = this.contract.filters[name](...filter);

      for await (const event of this._queryEventsChunked(
        eventFilter,
        fromBlock,
        resolvedToBlock
      )) {
        allEvents.push(this._formatEvent(event));
      }
    }

    // Sort by block number and remove duplicates
    const uniqueEvents = Array.from(
      new Map(allEvents.map((e) => [e.transactionHash + e.event, e])).values()
    ).sort((a, b) => a.blockNumber - b.blockNumber);

    return {
      address,
      totalEvents: uniqueEvents.length,
      events: uniqueEvents,
      queriedBlocks: {
        from: fromBlock,
        to: resolvedToBlock,
      },
    };
  }

  /**
   * Gets access grant history for a record
   */
  async getGrantHistory(recordId, options = {}) {
    const audit = await this.getRecordAudit(recordId, options);

    const grants = audit.events.filter(
      (e) => e.event === "AccessGranted" || e.event === "AccessRevoked"
    );

    // Build grant state timeline
    const grantStates = new Map();

    for (const event of grants) {
      const key = event.grantee;

      if (event.event === "AccessGranted") {
        grantStates.set(key, {
          grantee: event.grantee,
          expiry: event.expiry,
          wrappedKeyCid: event.wrappedKeyCid,
          grantedAt: event.timestamp || event.blockNumber,
          revoked: false,
          revokedAt: null,
        });
      } else if (event.event === "AccessRevoked") {
        const existing = grantStates.get(key);
        if (existing) {
          existing.revoked = true;
          existing.revokedAt = event.timestamp || event.blockNumber;
        }
      }
    }

    return {
      recordId,
      currentGrants: Array.from(grantStates.values()).filter((g) => !g.revoked),
      revokedGrants: Array.from(grantStates.values()).filter((g) => g.revoked),
      history: grants,
    };
  }

  /**
   * Gets access log entries for a record
   */
  async getAccessLogs(recordId, options = {}) {
    const audit = await this.getRecordAudit(recordId, options);

    const logs = audit.events
      .filter((e) => e.event === "AccessLogged")
      .map((log) => ({
        accessor: log.accessor,
        timestamp: log.timestamp,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }));

    return {
      recordId,
      totalAccesses: logs.length,
      logs,
    };
  }

  /**
   * Clears event cache
   */
  clearCache() {
    this.eventCache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheStats() {
    return {
      cachedRanges: this.eventCache.size,
      cacheKeys: Array.from(this.eventCache.keys()),
    };
  }
}

/**
 * Singleton instance
 */
let instance = null;

export function getShieldAudit() {
  if (!instance) {
    instance = new ShieldAuditService({
      rpcUrl: process.env.RPC_URL,
      maxBlockRange: parseInt(process.env.MAX_BLOCK_RANGE || "2000", 10),
    });
  }
  return instance;
}

export default ShieldAuditService;
