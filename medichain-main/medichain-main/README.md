# MediChain Shield

> **Patient-owned medical records secured by zero-knowledge encryption, IPFS, and Ethereum blockchain.**

A Web3 hackathon submission. Frontend on Vercel · Smart contract on Ethereum Sepolia · Express backend on Railway.

> Deployed to **Ethereum Sepolia** for testnet reliability — Polygon Amoy's public RPC was producing frequent timeouts during development.

---

## Problem

Medical records are controlled by hospitals and insurers — patients can't take them between providers without faxes, phone calls, or PDF exports. When breaches happen (133M US records exposed in 2023 alone), the data is there, unencrypted, on a server you didn't choose.

## Solution

MediChain Shield gives patients a cryptographic identity tied to their Ethereum wallet. Records are encrypted *in the browser* before upload. The server stores only ciphertext. Smart contracts on Ethereum enforce time-bounded, revocable access grants — no phone calls, no faxes, no data locked in a hospital silo.

**The server can be fully compromised and your medical data remains safe.** That's the zero-knowledge guarantee.

---

## Deployed Contract

| Field | Value |
|---|---|
| Contract | `AccessRegistry.sol` |
| Network | Ethereum Sepolia Testnet (Chain ID: 11155111) |
| Address | *(deploy required — see Step 1 below)* |
| Explorer | [sepolia.etherscan.io/address/...](https://sepolia.etherscan.io) |

---

## Security Architecture

```
Wallet Signature (EIP-191)
         │
         ▼
    HKDF-SHA256    →  X25519 Keypair  (memory only, never persisted)
                              │
              ┌───────────────┴───────────────┐
              │                               │
        AES-256-GCM                    crypto_box_seal
        (encrypt file)             (wrap key for grantee)
              │                               │
        ciphertext → IPFS            wrapped key → backend
              │                               │
        CID → Sepolia              expiry enforced by
              hash                  AccessRegistry.sol
```

**Properties:**
- **Zero-knowledge**: server sees only encrypted bytes + metadata
- **Authenticated encryption**: AES-GCM with record-ID-bound AAD prevents ciphertext transplant
- **Forward-secret sharing**: ephemeral X25519 sealed box per grantee
- **On-chain enforcement**: grants expire, can be revoked; immutable audit events
- **EIP-712 signature grants**: gasless delegation with nonce-based replay protection

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16.3.3 (App Router) · React 19 · TypeScript 5.7 · Tailwind CSS v4 |
| Cryptography | AES-256-GCM (WebCrypto API) · X25519 (libsodium-wrappers) · HKDF-SHA256 |
| Web3 | ethers.js v6 · EIP-191 signing · EIP-712 permits |
| Backend | Express 4 · Node.js ESM · JWT auth · Helmet · Zod |
| Blockchain | Solidity ^0.8.20 · Hardhat · **Ethereum Sepolia testnet** |
| Storage | IPFS via web3.storage (real) or in-memory mock (demo/Vercel) |
| Deployment | Vercel (frontend) · Railway/Render (backend) |

---

## Local Development

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- MetaMask browser extension
- Sepolia ETH for on-chain features (free from faucet below)

### Step 1: Deploy the contract

You need a wallet with Sepolia ETH. Get it free:

1. **Get Sepolia ETH** from [Alchemy Sepolia Faucet](https://sepoliafaucet.com/) or [Chainlink Faucet](https://faucets.chain.link/sepolia)
   - Use a **fresh/burner wallet** — not your main wallet
   - Fund the wallet address shown in MetaMask
2. Get a free Alchemy API key at [alchemy.com](https://www.alchemy.com/) — create an app targeting **Ethereum Sepolia**
3. Export your deployer wallet private key from MetaMask
4. Create `medichain-backend/.env`:

```bash
DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere
ALCHEMY_API_KEY=YourAlchemyKeyHere
ETHERSCAN_API_KEY=YourEtherscanKeyHere   # optional, for verification
```

5. Compile and deploy:

```bash
cd medichain-backend
npm install
npx hardhat compile
npx hardhat run scripts/deploy-shield.js --network sepolia
```

6. Copy the deployed address into `.env.local`:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedAddress
```

Also update `medichain-backend/server/.env`:
```bash
CONTRACT_ADDRESS=0xYourDeployedAddress
```

7. (Optional) Verify on Etherscan:

```bash
npx hardhat verify --network sepolia 0xYourDeployedAddress
```

8. Update this README with the real address + Etherscan link.

### Step 2: Configure environment

**Frontend** (`.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedAddress
NEXT_PUBLIC_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

**Backend** (`medichain-backend/server/.env`):

```env
PORT=4000
JWT_SECRET=change-this-in-production-use-long-random-string
CONTRACT_ADDRESS=0xYourDeployedAddress
BACKEND_SIGNER_PRIVATE_KEY=   # optional: relayer for gasless demo
WEB3_STORAGE_TOKEN=           # optional: real IPFS (blank = in-memory mock)
ANTHROPIC_API_KEY=            # optional: AI drug interaction checks
```

### Step 3: Run both services

```bash
# Start backend (Terminal 1)
cd medichain-backend/server
npm run dev      # nodemon on :4000

# Start frontend (Terminal 2)
pnpm dev         # Next.js on :3000
```

Open http://localhost:3000 and connect MetaMask.

---

## Vercel Deployment

Set these environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed `AccessRegistry` address |
| `NEXT_PUBLIC_SEPOLIA_RPC` | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` |

---

## Running Tests

```bash
# Frontend crypto unit tests
pnpm test:run
# → 36/36 passing

# Smart contract + AI guard tests
cd medichain-backend
npx hardhat test
# → 99/99 passing (38 contract + 44 AI guard + 17 attack demos)

# Build check
pnpm build
```

**Test summary:**
- Frontend crypto: **36/36 passing** (AES-256-GCM, X25519, HKDF-SHA256, sealed box)
- Contract (AccessRegistry): **38/38 passing** (grant, revoke, auth, EIP-712, replay protection)
- AI guard: **44/44 passing** (injection corpus, output validation, workflow, benign corpus)
- Attack demos: **17/17 passing** (visual attack scenario tests)

---

## What's Real vs. Demo/Mocked

| Feature | Status | Notes |
|---|---|---|
| Client-side AES-256-GCM encryption | Real | WebCrypto API, 36 unit tests passing |
| X25519 key derivation (HKDF) | Real | libsodium-wrappers |
| Wallet auth (EIP-191 + JWT) | Real | ethers.verifyMessage + jsonwebtoken |
| Smart contract (AccessRegistry) | Real | Ethereum Sepolia (deploy required — see Step 1) |
| On-chain audit trail | Real | Solidity events, queryable via ethers.js |
| EIP-712 gasless grants | Real | Replay-protected signature delegation |
| AI guard (3-layer injection defense) | Real | 44/44 tests passing, offline/mocked LLM |
| IPFS storage | Mock | In-memory when `WEB3_STORAGE_TOKEN` not set — clearly disclosed in-app |
| AI drug interaction check | Optional | Requires `ANTHROPIC_API_KEY` |
| In-memory record store | Demo | Production needs Postgres/Redis |
| Sepolia ETH gas costs | Testnet | Sepolia ETH is free from faucet |

---

## Project Structure

```
medichain-main/
├── app/
│   ├── page.tsx              # Landing page + wallet connect
│   ├── layout.tsx            # Root layout + WalletProvider
│   └── dashboard/page.tsx   # Patient dashboard (6 tabs: Overview, Records, Access, Provider, Audit, Security)
├── lib/
│   ├── WalletContext.tsx     # Global wallet state
│   ├── wallet.ts             # MetaMask auth + Sepolia chain switching
│   ├── api.ts                # Axios client for Express backend
│   ├── crypto/               # Zero-knowledge crypto engine
│   │   ├── keyDerivation.ts  # HKDF-SHA256 + X25519
│   │   ├── aesGcm.ts         # AES-256-GCM encrypt/decrypt
│   │   ├── keyWrap.ts        # libsodium sealed box wrap/unwrap
│   │   └── index.ts          # Full encrypt/decrypt flows
│   ├── shield-client/        # Typed Shield API client
│   │   └── registryContract.ts  # AccessRegistry contract wrapper
│   └── config/contracts.ts   # Env-driven contract address + ABI (Sepolia)
├── medichain-backend/
│   ├── contracts/
│   │   └── AccessRegistry.sol  # Main smart contract
│   ├── hardhat.config.js       # Sepolia + Amoy (secondary) networks
│   ├── scripts/
│   │   └── deploy-shield.js    # Hardhat deploy + config auto-generation
│   ├── test/
│   │   ├── AccessRegistry.test.js  # 38 contract tests
│   │   └── ai-guard.test.js        # 44 AI guard tests
│   └── server/               # Express backend
│       ├── index.js           # Entry point (port 4000)
│       ├── routes/            # /api/auth, /shield/*
│       └── services/          # auth, ipfs (mock-capable), ai-guard
└── vercel.json               # Vercel deployment config + security headers
```

---

## License

MIT
