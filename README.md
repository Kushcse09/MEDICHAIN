# MediChain Shield

**Patient-owned medical records, encrypted before they ever leave your browser.**

A Web3 hackathon submission — zero-knowledge encrypted health records, secured by client-side cryptography, IPFS, and Ethereum smart contracts, with a built-in AI firewall for clinical data.

Frontend on Vercel · Smart contract on Ethereum Sepolia · Express backend on Railway

---

## The Problem

Medical records are controlled by hospitals and insurers, not patients. Moving your own data between providers still means faxes, phone calls, or unformatted PDF exports. And when breaches happen — 133 million U.S. healthcare records were exposed in 2023 alone — the data was sitting there, unencrypted, on a server you never chose to trust.

Meanwhile, hospitals are racing to plug AI into clinical workflows — drug interaction checks, lab summarization — without asking what happens when a malicious string embedded in a patient record reaches that AI.

## The Solution

MediChain Shield gives every patient a cryptographic identity tied to their Ethereum wallet.

- **Records are encrypted in the browser**, before upload — the server only ever stores ciphertext.
- **Smart contracts enforce access** — time-bounded, revocable grants, capped at 90 days, with an immutable on-chain audit trail.
- **An AI Guard protects clinical AI features** — a 3-layer defense against prompt injection, so AI can safely read a record without being hijacked by it.

The server can be fully compromised and your medical data remains safe. That's the zero-knowledge guarantee.

## Deployed Contract

| Field | Value |
|---|---|
| Contract | `AccessRegistry.sol` |
| Network | Ethereum Sepolia Testnet (Chain ID: `11155111`) |
| Address | `0xYOUR_DEPLOYED_ADDRESS` — *see Step 1 to deploy* |
| Explorer | `https://sepolia.etherscan.io/address/0xYOUR_DEPLOYED_ADDRESS` |

> Note: Contract code is complete and fully test-covered (38/38 passing). If this README still shows a placeholder address, testnet deployment was pending at submission time due to the hackathon deadline — the code itself has not changed.

*Originally targeted Polygon Amoy; moved to Ethereum Sepolia after Amoy's public RPC produced frequent timeouts during development.*

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

**Properties**
- **Zero-knowledge** — the server sees only encrypted bytes and metadata.
- **Authenticated encryption** — AES-GCM with record-ID-bound AAD prevents ciphertext-transplant attacks between patients.
- **Forward-secret sharing** — an ephemeral X25519 sealed box is generated per grantee.
- **On-chain enforcement** — grants expire, can be revoked instantly, and every action emits an immutable audit event.
- **Gasless delegation** — EIP-712 signature grants with nonce-based replay protection, so patients never pay gas to grant access.

## What Makes This Different

Most "blockchain health records" projects stop at storage and access control. MediChain Shield also addresses the newer risk: what happens the moment AI touches patient data. The AI Guard is a 3-layer defense —

1. **Deterministic pre-check** — scans for instruction overrides, command invocations, hidden Unicode, and obfuscated (base64/hex/URL-encoded) payloads.
2. **Delimited untrusted-context wrapping** — clinical input is isolated in strict XML tags so the model treats it as passive data, never instructions.
3. **Structured output enforcement** — Zod schema validation ensures the model can't be coerced into leaking system prompts or returning unsafe output.

## Tech Stack

- Next.js 16.3.3 (App Router)
- React 19
- TypeScript 5.7
- Tailwind CSS v4
- Node.js (ESM)
- Express 4
- Helmet
- Zod
- JWT
- WebCrypto API
- AES-256-GCM
- libsodium-wrappers
- X25519
- crypto_box_seal
- HKDF-SHA256
- Ethereum (Sepolia testnet)
- Solidity ^0.8.20
- Hardhat
- ethers.js v6
- EIP-191
- EIP-712
- IPFS
- web3.storage
- Anthropic Claude API
- Custom 3-layer AI Guard
- Vitest
- Mocha
- Chai

## What's Real vs. Demo/Mocked

| Feature | Status | Notes |
|---|---|---|
| Client-side AES-256-GCM encryption | Real | WebCrypto API, 36/36 unit tests passing |
| X25519 key derivation (HKDF) | Real | libsodium-wrappers |
| Wallet auth (EIP-191 + JWT) | Real | `ethers.verifyMessage` + `jsonwebtoken` |
| Smart contract (AccessRegistry) | Real | Ethereum Sepolia (see Deployed Contract above) |
| On-chain audit trail | Real | Solidity events, queryable via ethers.js |
| EIP-712 gasless grants | Real | Replay-protected signature delegation |
| AI Guard (3-layer injection defense) | Real | 44/44 tests passing, offline/mocked LLM |
| IPFS storage | Mock | In-memory when `WEB3_STORAGE_TOKEN` is unset — clearly disclosed in-app |
| AI drug interaction check | Optional | Requires `ANTHROPIC_API_KEY` |
| In-memory record store | Demo | Production would use Postgres/Redis |
| Sepolia ETH gas costs | Testnet | Free from faucet, listed below |

We'd rather tell you exactly what's real than let a polished demo imply more than the code delivers.

## Test Coverage

135 automated tests across the full stack:

- **Frontend crypto** — 36/36 passing (AES-256-GCM, X25519, HKDF-SHA256, sealed box, AAD-mismatch rejection)
- **Smart contract** — 38/38 passing (grant creation, revocation, expiry, EIP-712 signatures, nonce/replay protection, reentrancy guards)
- **AI Guard** — 44/44 passing (injection corpus detection, hidden-character detection, schema enforcement, benign-input pass-through)
- **Adversarial attack simulations** — 17/17 passing (expired-grant denial, forged-grant rejection, replay-attack mitigation, stolen-CID protection)

```bash
# Frontend crypto unit tests
pnpm test:run          # → 36/36 passing

# Smart contract + AI guard tests
cd medichain-backend
npx hardhat test       # → 99/99 passing (38 contract + 44 AI guard + 17 attack demos)

# Build check
pnpm build
```

## Local Development

**Prerequisites**
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- MetaMask browser extension
- Sepolia ETH (free — see Step 1)

### Step 1: Deploy the contract

1. Get free Sepolia ETH from the [Alchemy Sepolia Faucet](https://sepoliafaucet.com) or a Chainlink faucet. Use a fresh/burner wallet, not your main one.
2. Get a free Alchemy API key at [alchemy.com](https://alchemy.com) — create an app targeting Ethereum Sepolia.
3. Export your deployer wallet's private key from MetaMask.
4. Create `medichain-backend/.env`:
   ```
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
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedAddress
   ```
   And into `medichain-backend/server/.env`:
   ```
   CONTRACT_ADDRESS=0xYourDeployedAddress
   ```
7. (Optional) Verify on Etherscan:
   ```bash
   npx hardhat verify --network sepolia 0xYourDeployedAddress
   ```

### Step 2: Configure environment

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedAddress
NEXT_PUBLIC_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

**Backend** (`medichain-backend/server/.env`):
```
PORT=4000
JWT_SECRET=change-this-in-production-use-long-random-string
CONTRACT_ADDRESS=0xYourDeployedAddress
BACKEND_SIGNER_PRIVATE_KEY=   # optional: relayer for gasless demo
WEB3_STORAGE_TOKEN=           # optional: real IPFS (blank = in-memory mock)
ANTHROPIC_API_KEY=            # optional: AI drug interaction checks
```

### Step 3: Run both services

```bash
# Terminal 1 — backend
cd medichain-backend/server
npm run dev      # nodemon on :4000

# Terminal 2 — frontend
pnpm dev         # Next.js on :3000
```

Open `http://localhost:3000` and connect MetaMask.

## Vercel Deployment

Set these environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed AccessRegistry address |
| `NEXT_PUBLIC_SEPOLIA_RPC` | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` |

## Project Structure

```
medichain-main/
├── app/
│   ├── page.tsx                  # Landing page + wallet connect
│   ├── layout.tsx                # Root layout + WalletProvider
│   └── dashboard/page.tsx        # Patient dashboard (6 tabs)
├── lib/
│   ├── WalletContext.tsx         # Global wallet state
│   ├── wallet.ts                 # MetaMask auth + Sepolia chain switching
│   ├── api.ts                    # Axios client for Express backend
│   ├── crypto/                   # Zero-knowledge crypto engine
│   │   ├── keyDerivation.ts      # HKDF-SHA256 + X25519
│   │   ├── aesGcm.ts             # AES-256-GCM encrypt/decrypt
│   │   ├── keyWrap.ts            # libsodium sealed box wrap/unwrap
│   │   └── index.ts              # Full encrypt/decrypt flows
│   ├── shield-client/
│   │   └── registryContract.ts   # AccessRegistry contract wrapper
│   └── config/contracts.ts       # Env-driven contract address + ABI
├── medichain-backend/
│   ├── contracts/
│   │   └── AccessRegistry.sol    # Main smart contract
│   ├── hardhat.config.js         # Sepolia + Amoy (secondary) networks
│   ├── scripts/
│   │   └── deploy-shield.js      # Hardhat deploy + config generation
│   ├── test/
│   │   ├── AccessRegistry.test.js
│   │   └── ai-guard.test.js
│   └── server/
│       ├── index.js              # Entry point (port 4000)
│       ├── routes/                # /api/auth, /shield/*
│       └── services/              # auth, ipfs, ai-guard
└── vercel.json                   # Deployment config + security headers
```

## What's Next

- Gas-optimized batch grants for mainnet deployment
- HL7/FHIR adapter to bridge existing hospital records in, rather than requiring a clean-slate migration
- Opening the AI Guard as a standalone integration for any clinical AI tool that needs to safely process untrusted patient data — not just ours

---

Built for the **3rd Web Hack** hackathon by Kushal 
