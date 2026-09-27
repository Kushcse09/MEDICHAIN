/**
 * MediChain Shield - AccessRegistry Contract Client
 * 
 * Typed interface for interacting with AccessRegistry smart contract.
 */

import { ethers } from "ethers";
import { contracts } from "../config/contracts";
import type { TransactionState } from "./types";

/**
 * AccessRegistry contract client
 */
export class AccessRegistryClient {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private signer?: ethers.Signer;

  constructor(
    provider: ethers.Provider,
    signer?: ethers.Signer
  ) {
    this.provider = provider;
    this.signer = signer;

    const config = contracts.AccessRegistry;
    this.contract = new ethers.Contract(
      config.address,
      config.abi,
      signer || provider
    );
  }

  /**
   * Get contract address
   */
  getAddress(): string {
    return contracts.AccessRegistry.address;
  }

  /**
   * Publish public key
   */
  async publishPublicKey(
    publicKey: string | Uint8Array,
    onStateChange?: (state: TransactionState) => void
  ): Promise<TransactionState> {
    if (!this.signer) {
      throw new Error("Signer required for write operations");
    }

    try {
      onStateChange?.({ status: "signing" });

      const tx = await this.contract.publishPublicKey(publicKey);

      onStateChange?.({
        status: "pending",
        txHash: tx.hash,
      });

      const receipt = await tx.wait();

      const block = await this.provider.getBlock(receipt.blockNumber);

      return {
        status: "confirmed",
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: block?.timestamp,
      };
    } catch (error) {
      const state: TransactionState = {
        status: "error",
        error: error instanceof Error ? error.message : "Transaction failed",
      };
      onStateChange?.(state);
      return state;
    }
  }

  /**
   * Register record
   */
  async registerRecord(
    recordId: string,
    onStateChange?: (state: TransactionState) => void
  ): Promise<TransactionState> {
    if (!this.signer) {
      throw new Error("Signer required for write operations");
    }

    try {
      onStateChange?.({ status: "signing" });

      const tx = await this.contract.registerRecord(recordId);

      onStateChange?.({
        status: "pending",
        txHash: tx.hash,
      });

      const receipt = await tx.wait();
      const block = await this.provider.getBlock(receipt.blockNumber);

      return {
        status: "confirmed",
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: block?.timestamp,
      };
    } catch (error) {
      const state: TransactionState = {
        status: "error",
        error: error instanceof Error ? error.message : "Transaction failed",
      };
      onStateChange?.(state);
      return state;
    }
  }

  /**
   * Grant access to record
   */
  async grantAccess(
    recordId: string,
    grantee: string,
    expiry: number,
    wrappedKeyCid: string,
    onStateChange?: (state: TransactionState) => void
  ): Promise<TransactionState> {
    if (!this.signer) {
      throw new Error("Signer required for write operations");
    }

    try {
      onStateChange?.({ status: "signing" });

      const tx = await this.contract.grantAccess(
        recordId,
        grantee,
        expiry,
        wrappedKeyCid
      );

      onStateChange?.({
        status: "pending",
        txHash: tx.hash,
      });

      const receipt = await tx.wait();
      const block = await this.provider.getBlock(receipt.blockNumber);

      return {
        status: "confirmed",
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: block?.timestamp,
      };
    } catch (error) {
      const state: TransactionState = {
        status: "error",
        error: error instanceof Error ? error.message : "Transaction failed",
      };
      onStateChange?.(state);
      return state;
    }
  }

  /**
   * Grant access with EIP-712 signature
   */
  async grantAccessWithSig(
    recordId: string,
    grantee: string,
    expiry: number,
    wrappedKeyCid: string,
    deadline: number,
    v: number,
    r: string,
    s: string,
    onStateChange?: (state: TransactionState) => void
  ): Promise<TransactionState> {
    if (!this.signer) {
      throw new Error("Signer required for write operations");
    }

    try {
      onStateChange?.({ status: "signing" });

      const tx = await this.contract.grantAccessWithSig(
        recordId,
        grantee,
        expiry,
        wrappedKeyCid,
        deadline,
        v,
        r,
        s
      );

      onStateChange?.({
        status: "pending",
        txHash: tx.hash,
      });

      const receipt = await tx.wait();
      const block = await this.provider.getBlock(receipt.blockNumber);

      return {
        status: "confirmed",
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: block?.timestamp,
      };
    } catch (error) {
      const state: TransactionState = {
        status: "error",
        error: error instanceof Error ? error.message : "Transaction failed",
      };
      onStateChange?.(state);
      return state;
    }
  }

  /**
   * Revoke access
   */
  async revokeAccess(
    recordId: string,
    grantee: string,
    onStateChange?: (state: TransactionState) => void
  ): Promise<TransactionState> {
    if (!this.signer) {
      throw new Error("Signer required for write operations");
    }

    try {
      onStateChange?.({ status: "signing" });

      const tx = await this.contract.revokeAccess(recordId, grantee);

      onStateChange?.({
        status: "pending",
        txHash: tx.hash,
      });

      const receipt = await tx.wait();
      const block = await this.provider.getBlock(receipt.blockNumber);

      return {
        status: "confirmed",
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: block?.timestamp,
      };
    } catch (error) {
      const state: TransactionState = {
        status: "error",
        error: error instanceof Error ? error.message : "Transaction failed",
      };
      onStateChange?.(state);
      return state;
    }
  }

  /**
   * Check if address is authorized for record
   */
  async isAuthorized(recordId: string, accessor: string): Promise<boolean> {
    return await this.contract.isAuthorized(recordId, accessor);
  }

  /**
   * Log access to record
   */
  async logAccess(
    recordId: string,
    onStateChange?: (state: TransactionState) => void
  ): Promise<TransactionState> {
    if (!this.signer) {
      throw new Error("Signer required for write operations");
    }

    try {
      onStateChange?.({ status: "signing" });

      const tx = await this.contract.logAccess(recordId);

      onStateChange?.({
        status: "pending",
        txHash: tx.hash,
      });

      const receipt = await tx.wait();
      const block = await this.provider.getBlock(receipt.blockNumber);

      return {
        status: "confirmed",
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: block?.timestamp,
      };
    } catch (error) {
      const state: TransactionState = {
        status: "error",
        error: error instanceof Error ? error.message : "Transaction failed",
      };
      onStateChange?.(state);
      return state;
    }
  }

  /**
   * Get grant details
   */
  async getGrant(
    recordId: string,
    grantee: string
  ): Promise<{
    expiry: bigint;
    revoked: boolean;
    exists: boolean;
  }> {
    // Returns (uint256 expiry, bool revoked, bool exists)
    const [expiry, revoked, exists] = await this.contract.getGrant(recordId, grantee);
    return { expiry, revoked, exists };
  }

  /**
   * Get wrapped key CID for grantee
   */
  async getWrappedKey(recordId: string, grantee: string): Promise<string> {
    return await this.contract.getWrappedKey(recordId, grantee);
  }

  /**
   * Get public key for address
   */
  async getPublicKey(address: string): Promise<string> {
    return await this.contract.publicKeys(address);
  }

  /**
   * Get EIP-712 domain separator
   */
  async getDomainSeparator(): Promise<string> {
    return await this.contract.DOMAIN_SEPARATOR();
  }

  /**
   * Get nonce for address (for EIP-712 signing)
   */
  async getNonce(address: string): Promise<bigint> {
    return await this.contract.nonces(address);
  }

  /**
   * Get max grant duration
   */
  async getMaxGrantDuration(): Promise<bigint> {
    return await this.contract.MAX_GRANT_DURATION();
  }
}

export default AccessRegistryClient;
