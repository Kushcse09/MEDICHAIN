/**
 * MediChain Shield - Contract Configuration
 *
 * The contract address is driven by the NEXT_PUBLIC_CONTRACT_ADDRESS env var
 * so it works on Vercel with the real deployed address, and falls back to the
 * localhost Hardhat address for local dev.
 *
 * ABI matches AccessRegistry.sol compiled with Solidity 0.8.20.
 * Updated to exactly match deployed contract interface.
 */

// Runtime address: env var (Vercel/prod) → .env.local → zero-address (offline)
function resolveAddress(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
    const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (addr && addr !== "0xYourDeployedContractAddress" && addr.startsWith("0x")) {
      return addr;
    }
  }
  // Fallback: localhost Hardhat default (for local dev without env var)
  return "0x5FbDB2315678afecb367f032d93F642f64180aa3";
}

export const CONTRACT_ADDRESS = resolveAddress();
export const CONTRACT_NETWORK = "Ethereum Sepolia Testnet";
export const CONTRACT_CHAIN_ID = 11155111; // Ethereum Sepolia

export const contracts = {
  AccessRegistry: {
    address: CONTRACT_ADDRESS,
    network: "sepolia",
    chainId: "11155111",
    abi: [
      // Errors
      { "type": "error", "name": "DuplicateGrant", "inputs": [] },
      { "type": "error", "name": "EmptyRecordId", "inputs": [] },
      { "type": "error", "name": "GrantExpired", "inputs": [] },
      { "type": "error", "name": "GrantNotFound", "inputs": [] },
      { "type": "error", "name": "GrantRevoked", "inputs": [] },
      { "type": "error", "name": "InvalidExpiry", "inputs": [] },
      { "type": "error", "name": "InvalidSignature", "inputs": [] },
      { "type": "error", "name": "MaxExpiryExceeded", "inputs": [] },
      { "type": "error", "name": "RecordNotFound", "inputs": [] },
      { "type": "error", "name": "ReentrancyGuard", "inputs": [] },
      { "type": "error", "name": "SignatureExpired", "inputs": [] },
      { "type": "error", "name": "Unauthorized", "inputs": [] },
      { "type": "error", "name": "ZeroAddress", "inputs": [] },
      // Events
      {
        "type": "event", "name": "PublicKeyPublished", "anonymous": false,
        "inputs": [
          { "name": "account", "type": "address", "indexed": true, "internalType": "address" },
          { "name": "publicKey", "type": "bytes32", "indexed": false, "internalType": "bytes32" },
          { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
        ]
      },
      {
        "type": "event", "name": "RecordRegistered", "anonymous": false,
        "inputs": [
          { "name": "recordId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
          { "name": "owner", "type": "address", "indexed": true, "internalType": "address" },
          { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
        ]
      },
      {
        "type": "event", "name": "AccessGranted", "anonymous": false,
        "inputs": [
          { "name": "recordId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
          { "name": "owner", "type": "address", "indexed": true, "internalType": "address" },
          { "name": "grantee", "type": "address", "indexed": true, "internalType": "address" },
          { "name": "expiry", "type": "uint256", "indexed": false, "internalType": "uint256" },
          { "name": "wrappedKeyCid", "type": "string", "indexed": false, "internalType": "string" },
          { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
        ]
      },
      {
        "type": "event", "name": "AccessRevoked", "anonymous": false,
        "inputs": [
          { "name": "recordId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
          { "name": "owner", "type": "address", "indexed": true, "internalType": "address" },
          { "name": "grantee", "type": "address", "indexed": true, "internalType": "address" },
          { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
        ]
      },
      {
        "type": "event", "name": "AccessLogged", "anonymous": false,
        "inputs": [
          { "name": "recordId", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
          { "name": "accessor", "type": "address", "indexed": true, "internalType": "address" },
          { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
        ]
      },
      // State variable getters
      {
        "type": "function", "name": "publicKeys", "stateMutability": "view",
        "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
        "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }]
      },
      {
        "type": "function", "name": "records", "stateMutability": "view",
        "inputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
        "outputs": [
          { "name": "owner", "type": "address", "internalType": "address" },
          { "name": "exists", "type": "bool", "internalType": "bool" }
        ]
      },
      {
        "type": "function", "name": "nonces", "stateMutability": "view",
        "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }]
      },
      // Constants
      {
        "type": "function", "name": "MAX_GRANT_DURATION", "stateMutability": "view",
        "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }]
      },
      {
        "type": "function", "name": "DOMAIN_TYPEHASH", "stateMutability": "view",
        "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }]
      },
      {
        "type": "function", "name": "GRANT_PERMIT_TYPEHASH", "stateMutability": "view",
        "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }]
      },
      // Write functions
      {
        "type": "function", "name": "publishPublicKey", "stateMutability": "nonpayable",
        "inputs": [{ "name": "x25519PublicKey", "type": "bytes32", "internalType": "bytes32" }],
        "outputs": []
      },
      {
        "type": "function", "name": "registerRecord", "stateMutability": "nonpayable",
        "inputs": [{ "name": "recordId", "type": "bytes32", "internalType": "bytes32" }],
        "outputs": []
      },
      {
        "type": "function", "name": "grantAccess", "stateMutability": "nonpayable",
        "inputs": [
          { "name": "recordId", "type": "bytes32", "internalType": "bytes32" },
          { "name": "grantee", "type": "address", "internalType": "address" },
          { "name": "expiry", "type": "uint256", "internalType": "uint256" },
          { "name": "wrappedKeyCid", "type": "string", "internalType": "string" }
        ],
        "outputs": []
      },
      {
        "type": "function", "name": "grantAccessWithSig", "stateMutability": "nonpayable",
        "inputs": [
          { "name": "recordId", "type": "bytes32", "internalType": "bytes32" },
          { "name": "grantee", "type": "address", "internalType": "address" },
          { "name": "expiry", "type": "uint256", "internalType": "uint256" },
          { "name": "wrappedKeyCid", "type": "string", "internalType": "string" },
          { "name": "deadline", "type": "uint256", "internalType": "uint256" },
          { "name": "v", "type": "uint8", "internalType": "uint8" },
          { "name": "r", "type": "bytes32", "internalType": "bytes32" },
          { "name": "s", "type": "bytes32", "internalType": "bytes32" }
        ],
        "outputs": []
      },
      {
        "type": "function", "name": "revokeAccess", "stateMutability": "nonpayable",
        "inputs": [
          { "name": "recordId", "type": "bytes32", "internalType": "bytes32" },
          { "name": "grantee", "type": "address", "internalType": "address" }
        ],
        "outputs": []
      },
      {
        "type": "function", "name": "logAccess", "stateMutability": "nonpayable",
        "inputs": [{ "name": "recordId", "type": "bytes32", "internalType": "bytes32" }],
        "outputs": []
      },
      // View functions
      {
        "type": "function", "name": "isAuthorized", "stateMutability": "view",
        "inputs": [
          { "name": "recordId", "type": "bytes32", "internalType": "bytes32" },
          { "name": "accessor", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }]
      },
      {
        "type": "function", "name": "getGrant", "stateMutability": "view",
        "inputs": [
          { "name": "recordId", "type": "bytes32", "internalType": "bytes32" },
          { "name": "grantee", "type": "address", "internalType": "address" }
        ],
        "outputs": [
          { "name": "expiry", "type": "uint256", "internalType": "uint256" },
          { "name": "revoked", "type": "bool", "internalType": "bool" },
          { "name": "exists", "type": "bool", "internalType": "bool" }
        ]
      },
      {
        "type": "function", "name": "getWrappedKey", "stateMutability": "view",
        "inputs": [
          { "name": "recordId", "type": "bytes32", "internalType": "bytes32" },
          { "name": "grantee", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "string", "internalType": "string" }]
      },
      {
        "type": "function", "name": "DOMAIN_SEPARATOR", "stateMutability": "view",
        "inputs": [],
        "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }]
      }
    ],
  },
} as const;

export type ContractConfig = typeof contracts;
