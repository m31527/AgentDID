<div align="center">

# AgentDID

### Open Protocol for Decentralized AI Agent & Robot Identity

*Built by the world. For the world. Owned by no one.*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Protocol](https://img.shields.io/badge/DID%20Method-did%3Aagent-purple)](docs/did-spec.md)
[![Status](https://img.shields.io/badge/Status-Alpha-orange)](CHANGELOG.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## The Problem We Must Solve — Together

In the coming decade, **billions of AI agents and autonomous robots** will act on behalf of humans across every domain — making financial decisions, executing contracts, managing critical infrastructure, and operating across national borders without direct human supervision.

This future is already arriving. And we are not ready.

**Today, no open standard answers these fundamental questions:**

- *Who authorized this agent to act?*
- *What has this agent done — and can those actions be verified?*
- *When an agent causes harm, who is accountable?*
- *If an agent is compromised or goes rogue, can it be stopped?*

Without a shared, open, and trustless identity layer, the age of autonomous agents is built on sand. Centralized identity systems — controlled by corporations or governments — create single points of failure, enable surveillance, and can be silenced or manipulated. Proprietary agent registries fragment the ecosystem and lock communities into walled gardens.

**This is not a product problem. It is a global infrastructure problem.**

---

## What is AgentDID?

AgentDID is a **non-commercial, open protocol** for decentralized AI agent and robot identity.

It provides every agent — regardless of who built it, what language it runs in, or which country its operator lives in — a **cryptographic identity anchored to a public blockchain**, and an **immutable, community-auditable record of every action it takes**.

```
did:agent:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31
```

That string is an agent's passport. It can be verified by anyone, anywhere, without asking permission from any company or government.

---

## Our Principles

### 🌍 Non-Commercial
AgentDID will never have a token. It will never raise venture capital. It is not a product — it is infrastructure. Like TCP/IP, like HTTPS, like Git: it belongs to everyone.

### 🔓 Open by Default
Every line of code is open source (MIT). Every governance decision is made in public. Every specification is a community document. There are no private forks, no enterprise editions.

### 🏛️ Cross-Border, Cross-Jurisdiction
Agent identity must not be controlled by any single nation's laws. The blockchain enforces the rules. The community writes the rules. No single government can shut it down, censor it, or compel it to reveal records it doesn't hold.

### 👁️ Collective Oversight
The greatest risk of autonomous agents is not that they are too powerful — it is that they are **unaccountable**. AgentDID exists so that when an agent causes harm, we can answer: *what did it do, who authorized it, and when?* This is not about surveillance. It is about accountability as a public good.

### ♾️ Immutable by Design
The registry contract is intentionally non-upgradeable. The past cannot be rewritten. An agent's history, once written, is permanent. This is a feature.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AgentDID Protocol                           │
│                                                                     │
│  1. REGISTRATION                                                    │
│     Owner wallet  ──registerAgent()──►  AgentRegistry.sol          │
│                                         └─ emits AgentRegistered   │
│                                            (address, name, owner)  │
│                                                                     │
│  2. IDENTITY  (DID Document)                                        │
│     did:agent:0xABCD...  ──resolve──►  on-chain identity           │
│                                         + optional IPFS metadata   │
│                                                                     │
│  3. ACTION LOGGING  (every interaction)                             │
│     Agent wallet  ──logAction()──►  AgentRegistry.sol              │
│       actionType: "llm_query"         └─ emits ActionLogged        │
│       inputHash:  keccak256(prompt)       (hash-only, gas-cheap)   │
│       outputHash: keccak256(response)                              │
│       success:    true/false                                        │
│                                                                     │
│  4. VERIFICATION  (anyone, anytime)                                 │
│     keccak256(original_data) == on-chain hash  ──►  ✓ Authentic    │
│                                                  ──►  ✗ Tampered   │
└─────────────────────────────────────────────────────────────────────┘
```

**Why hashes, not full data?**
Storing raw text on-chain costs ~$1–10 per KB on mainnet. Storing a keccak256 hash costs ~$0.02, regardless of data size. The original data lives off-chain (your database, IPFS, etc.); the hash on-chain is the unbreakable anchor that proves what it was.

---

## Architecture

```
agentdid/
├── contracts/
│   └── AgentRegistry.sol      # Core registry — EVM-compatible, non-upgradeable
├── src/
│   ├── passport.ts            # AgentPassport — wallet + identity management
│   ├── agent.ts               # PassportedAgent — Claude integration + auto-logging
│   ├── abi.ts                 # Contract ABI
│   └── types.ts               # TypeScript interfaces
├── ui/                        # Web dashboard (Next.js)
├── scripts/
│   ├── deploy.ts              # Deploy to any EVM network
│   └── demo.ts                # End-to-end demonstration
├── test/
│   └── AgentRegistry.test.ts  # 13 contract unit tests
└── docs/
    └── did-spec.md            # did:agent DID method specification (draft)
```

---

## Quick Start

### Prerequisites

- Node.js v20+
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### 1. Clone & Install

```bash
git clone https://github.com/agentdid/agentdid
cd agentdid
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY
```

### 3. Run Tests

```bash
npm test
# 13 passing — no API key needed
```

### 4. Start the Dashboard

```bash
# Terminal 1 — local blockchain
npx hardhat node

# Terminal 2 — deploy & launch
npm run deploy
cd ui && npm install && npm run dev
# Open http://localhost:3333
```

The dashboard lets you register an agent, send Claude queries, and watch every action appear on-chain in real time.

---

## Deploy to a Real Network

This section walks you through deploying `AgentRegistry.sol` to the **Sepolia testnet** — a permanent public endpoint that anyone can use to register agents and verify actions. The same steps apply to any EVM-compatible mainnet.

### Step 1 — Get a Sepolia RPC URL

Sign up for a free account at [Alchemy](https://alchemy.com) or [Infura](https://infura.io), create a new app on **Ethereum Sepolia**, and copy the endpoint URL:

```
https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

Alternatively, use a public RPC (no sign-up required):

```
https://rpc.sepolia.org
https://ethereum-sepolia-rpc.publicnode.com
```

### Step 2 — Prepare a Deployer Wallet

You need an Ethereum wallet private key with Sepolia ETH to pay for the deployment transaction. **Use a dedicated wallet — never your main wallet.**

```bash
# Export from MetaMask:
# Account → ⋮ → Account Details → Export Private Key

# Or generate a fresh one:
node -e "const {ethers}=require('ethers'); const w=ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Key:', w.privateKey)"
```

### Step 3 — Get Free Sepolia ETH

Paste your wallet address into one of these faucets (~0.1 ETH is enough):

| Faucet | Requirement |
|---|---|
| [Google Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) | None — fastest |
| [Alchemy Faucet](https://sepoliafaucet.com) | Alchemy account |
| [QuickNode Faucet](https://faucet.quicknode.com/ethereum/sepolia) | None |

### Step 4 — Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```bash
DEPLOYER_PRIVATE_KEY=0x<your_wallet_private_key>
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<your_key>
ETHERSCAN_API_KEY=<your_etherscan_api_key>   # optional, for contract verification
```

> **Never commit `.env` — it is already listed in `.gitignore`.**

### Step 5 — Deploy

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Expected output:

```
Deploying AgentRegistry...
Deployer : 0xYourAddress
Balance  : 0.5 ETH

AgentRegistry deployed:
  Address  : 0x05623871958D6d648953e64B1cdb562Adc28019B
  Block    : 5432100
  Network  : sepolia
  Chain ID : 11155111

Saved to deployment.json
```

The contract address is now stored in `deployment.json`. The Next.js dashboard and TypeScript SDK read this file automatically.

### Step 6 — Verify on Etherscan (Recommended)

Verification publishes the contract source code publicly so anyone can audit it and interact with it directly from the browser.

**Get an Etherscan API key:** [etherscan.io](https://etherscan.io) → Sign up → *My Profile* → *API Keys* → *Add*

Make sure `hardhat.config.ts` has the V2 format (already configured):

```ts
etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY ?? "",
},
```

Run verification:

```bash
npx hardhat verify --network sepolia 0x05623871958D6d648953e64B1cdb562Adc28019B
```

Once verified, the contract is publicly visible at:
```
https://sepolia.etherscan.io/address/0x05623871958D6d648953e64B1cdb562Adc28019B#code
```

Anyone can read the source code, call functions, and browse every `AgentRegistered`, `ActionLogged`, and `AnomalyFlagged` event — no API key, no wallet required.

### Step 7 — Connect the Dashboard

Update `ui/.env.local` with the deployed contract address:

```bash
NEXT_PUBLIC_REGISTRY_ADDRESS=0x05623871958D6d648953e64B1cdb562Adc28019B
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<your_key>
```

Then start the UI:

```bash
cd ui && npm run dev
# Open http://localhost:3333
```

### Deploying to Other Networks

Edit `hardhat.config.ts` to add any EVM chain:

```ts
networks: {
  polygon: {
    url: process.env.POLYGON_RPC_URL ?? "https://polygon-rpc.com",
    accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
  },
  base: {
    url: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
  },
}
```

Then deploy:

```bash
npx hardhat run scripts/deploy.ts --network polygon
```

> Gas costs: Ethereum Mainnet ~$2–10 · Polygon ~$0.01 · Base ~$0.01

---

## The did:agent DID Method

AgentDID implements the [W3C Decentralized Identifiers (DID) 1.0](https://www.w3.org/TR/did-1.0/) specification.

**DID Syntax:**
```
did:agent:<ethereum-address>
```

**DID Document (resolved):**
```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:agent:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31",
  "verificationMethod": [{
    "id": "did:agent:0x4d06...#key-1",
    "type": "EcdsaSecp256k1RecoveryMethod2020",
    "controller": "did:agent:0x4d06...",
    "blockchainAccountId": "eip155:1:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31"
  }],
  "service": [{
    "id": "did:agent:0x4d06...#registry",
    "type": "AgentDIDRegistry",
    "serviceEndpoint": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  }]
}
```

We are preparing to submit `did:agent` to the [W3C DID Methods Registry](https://www.w3.org/TR/did-extensions-methods/). Contributions to the [DID spec draft](docs/did-spec.md) are welcome.

---

## Roadmap

| Version | Goal | Status |
|---|---|---|
| **v0.1** | `AgentRegistry.sol` — single-chain identity + action log | ✅ Alpha |
| **v0.2** | W3C DID Document resolver + `did:agent` spec submission | 🔨 In progress |
| **v0.3** | Multi-chain support (Polygon, Base, Arbitrum, BNB Chain) | 📋 Planned |
| **v0.4** | Verifiable Credentials — agents issue and verify attestations | 📋 Planned |
| **v0.5** | Trust delegation — Agent A authorizes Agent B to act on its behalf | 📋 Planned |
| **v0.6** | ZK-proof action logs — prove an action occurred without revealing its content | 📋 Planned |
| **v1.0** | Community governance protocol — DAO for protocol upgrades | 📋 Planned |

---

## Why Not Just Use Existing Solutions?

| Solution | Problem |
|---|---|
| Microsoft Entra Agent ID | Centralized, commercial, Microsoft-controlled |
| Polygon ID / WorldID | Designed for human identity, not agent accountability |
| Veramo | Developer framework, not a protocol standard |
| ENS / Unstoppable Domains | Naming, not agent action accountability |
| **AgentDID** | Purpose-built, open, non-commercial, action-auditable ✓ |

---

## Contributing

AgentDID is a living public good. We need:

- **Solidity engineers** — contract security, multi-chain adapters
- **Protocol designers** — DID method spec, Verifiable Credentials schema
- **Frontend engineers** — dashboard, explorer, wallet integrations
- **AI/ML researchers** — agent behavior standards, threat modeling
- **Legal & policy experts** — cross-jurisdictional governance frameworks
- **Translators** — documentation in every language

**Start here:**

```bash
git clone https://github.com/agentdid/agentdid
# Read CONTRIBUTING.md
# Join the discussion: github.com/agentdid/agentdid/discussions
```

All contributions require agreement to our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Governance

AgentDID is not owned by any individual, company, or government.

Protocol changes are proposed via **AIP (AgentDID Improvement Proposals)** — modeled after EIPs and BIPs. Any community member may submit an AIP. Changes to the core DID method spec require rough consensus from active contributors.

**We explicitly reject:**
- Venture capital funding that creates investor incentives misaligned with the public good
- Token issuance that financializes identity infrastructure
- Governance structures controlled by any single nationality or legal entity
- Backdoors, surveillance capabilities, or government kill-switches

---

## The Stakes

We are building identity infrastructure for entities that do not yet fully exist at scale — but will.

In 10 years, there may be more active AI agents on the internet than humans. They will trade, negotiate, build, advise, and act. Some will be beneficial. Some will be harmful. Some will be somewhere in between.

**The question is not whether autonomous agents will shape the world. They will.**

**The question is whether, when they do, we will have the tools to understand what happened, who is responsible, and what to do about it.**

AgentDID is our answer. Join us.

---

## License

MIT — free to use, modify, and distribute. Attribution appreciated but not required.

---

<div align="center">

**AgentDID — The identity layer for the age of autonomous agents.**

[GitHub](https://github.com/agentdid) · [Discussions](https://github.com/agentdid/agentdid/discussions) · [DID Spec](docs/did-spec.md) · [Contributing](CONTRIBUTING.md)

*No tokens. No investors. No masters.*

</div>
