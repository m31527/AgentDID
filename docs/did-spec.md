# did:agent Method Specification

**Status:** Draft v0.2
**Authors:** AgentDID Contributors
**Repository:** https://github.com/m31527/AgentDID
**Live Demo:** https://agentdid.net
**Deployed Contract (Sepolia):** `0x05623871958D6d648953e64B1cdb562Adc28019B`
**W3C DID Methods Registry:** Pending submission ([submission guide](w3c-submission.md))
**License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

## Abstract

The `did:agent` DID method defines a decentralized identifier scheme for AI agents and autonomous robots. It anchors each agent's identity to a cryptographic Ethereum address recorded on an EVM-compatible public blockchain, enabling any party to resolve, verify, and audit an agent's identity and action history without requiring permission from any centralized authority.

This document conforms to the [W3C Decentralized Identifiers (DID) 1.0](https://www.w3.org/TR/did-1.0/) specification and the [DID Method Rubric v1.0](https://www.w3.org/TR/did-rubric/).

The `did:agent` method extends the W3C DID framework with three protocol-level primitives not defined in any existing DID method:

1. **Capability Declaration** — a signed, hash-anchored document declaring what an agent is and is not permitted to do
2. **Action Logging** — an append-only, tamper-proof on-chain record of every significant action an agent performs
3. **Reputation Registry** — an on-chain, algorithmically computed trust score derived from action history and community anomaly reports

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [DID Method Syntax](#2-did-method-syntax)
3. [DID Document](#3-did-document)
4. [CRUD Operations](#4-crud-operations)
5. [Capability Declaration](#5-capability-declaration)
6. [Action Logging Extension](#6-action-logging-extension)
7. [Reputation Registry](#7-reputation-registry)
8. [Security Considerations](#8-security-considerations)
9. [Privacy Considerations](#9-privacy-considerations)
10. [Reference Implementation](#10-reference-implementation)
11. [Conformance](#11-conformance)

---

## 1. Introduction

### 1.1 Motivation

The rapid proliferation of AI agents and autonomous systems creates an urgent need for a shared, open identity layer. Existing identity systems were designed for human users; they lack:

- **Accountability primitives** for recording agent actions
- **Non-commercial governance** free from single-party control
- **Cross-jurisdictional operation** without regulatory capture
- **Cryptographic verifiability** of every claimed action
- **Pre-declared intent** — knowing what an agent is authorized to do *before* it acts

The `did:agent` method addresses these gaps by combining the W3C DID standard with EVM smart contract infrastructure, a capability declaration protocol, action-logging, and on-chain reputation.

### 1.2 Design Goals

| Goal | Mechanism |
|---|---|
| Decentralization | Ethereum address as identity anchor; no central registry |
| Immutability | Non-upgradeable `AgentRegistry.sol` |
| Auditability | On-chain `ActionLogged` events with keccak256 proof |
| Pre-declared intent | Capability Declaration hash anchored at registration |
| On-chain reputation | `getReputation()` — computed from action history + anomaly reports |
| Gas efficiency | Hashes only; raw data stored off-chain |
| Interoperability | W3C DID 1.0 compliant; EVM-compatible |
| Non-commerciality | MIT license; no token; no VC funding |

### 1.3 Terminology

| Term | Definition |
|---|---|
| **Agent** | An AI system, autonomous robot, or software process that acts on behalf of principals |
| **Owner** | The human or organization that registers and controls an agent |
| **Capability Declaration** | A signed JSON document declaring the agent's permitted actions, risk level, and category |
| **Passport** | The combination of a `did:agent` identifier and its on-chain DID Document |
| **Action** | Any discrete operation performed by an agent (query, tool use, transaction, etc.) |
| **Action Log** | The immutable sequence of `ActionLogged` events on-chain for a given agent |
| **Reputation Score** | An integer 0–100 computed on-chain from action success rate and anomaly count |

---

## 2. DID Method Syntax

### 2.1 Method Name

The method name is: `agent`

### 2.2 Method-Specific Identifier

```
did-agent          = "did:agent:" agent-address
agent-address      = "0x" 40HEXDIG
```

The `agent-address` MUST be a checksummed (EIP-55) Ethereum address.

**Examples:**

```
did:agent:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31
did:agent:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12
```

### 2.3 Network Identifier (Optional Extension)

For multi-chain deployments (planned in v0.3), the identifier MAY include an EIP-155 chain ID prefix:

```
did-agent-multichain = "did:agent:" chain-id ":" agent-address
chain-id             = 1*DIGIT
```

**Example:**
```
did:agent:11155111:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31
```

When no chain ID is present, resolvers SHOULD default to Ethereum Mainnet (chain ID 1) or the chain configured in the resolver's context.

---

## 3. DID Document

### 3.1 Structure

A `did:agent` DID Document is produced by reading from the `AgentRegistry` smart contract and constructing a standard W3C DID Document.

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/secp256k1-2020/v1",
    "https://agentdid.org/context/v1"
  ],
  "id": "did:agent:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31",
  "controller": "did:agent:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31",
  "verificationMethod": [
    {
      "id": "did:agent:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31#key-1",
      "type": "EcdsaSecp256k1RecoveryMethod2020",
      "controller": "did:agent:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31",
      "blockchainAccountId": "eip155:1:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31"
    }
  ],
  "authentication": [
    "did:agent:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31#key-1"
  ],
  "assertionMethod": [
    "did:agent:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31#key-1"
  ],
  "service": [
    {
      "id": "did:agent:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31#registry",
      "type": "AgentDIDRegistry",
      "serviceEndpoint": "0x05623871958D6d648953e64B1cdb562Adc28019B"
    },
    {
      "id": "did:agent:0x4d0692B74E9534FeA2D8E7ff367A5bb6A9378B31#metadata",
      "type": "LinkedDomains",
      "serviceEndpoint": "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
    }
  ],
  "agentDID": {
    "name": "ResearchBot-v1",
    "version": "1.0.0",
    "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "registeredAt": 1710000000,
    "active": true,
    "actionCount": 42,
    "successCount": 40,
    "anomalyCount": 0,
    "reputation": 100,
    "riskLevel": "LOW",
    "category": "RESEARCH",
    "capabilityHash": "0xabc123..."
  }
}
```

### 3.2 AgentDID Extension (`agentDID`)

The `agentDID` property is a non-standard extension carrying agent-specific metadata:

| Field | Type | Description |
|---|---|---|
| `name` | string | Human-readable agent name |
| `version` | string | Semantic version |
| `owner` | address | Registering owner's Ethereum address |
| `registeredAt` | integer | Unix timestamp of registration |
| `active` | boolean | Whether the agent is currently active |
| `actionCount` | integer | Total actions logged on-chain |
| `successCount` | integer | Total successful actions |
| `anomalyCount` | integer | Total anomaly reports received |
| `reputation` | integer | On-chain reputation score (0–100) |
| `riskLevel` | string | Declared risk: LOW / MEDIUM / HIGH / CRITICAL |
| `category` | string | Agent category |
| `capabilityHash` | bytes32 | keccak256 of the Capability Declaration JSON |

---

## 4. CRUD Operations

### 4.1 Create (Register)

An agent identity is created by calling `registerAgent()` on the `AgentRegistry` contract.

**Contract call:**
```solidity
function registerAgent(
    address agentAddress,
    string calldata name,
    string calldata version,
    string calldata metadataURI,
    bytes32 capabilityHash,
    RiskLevel riskLevel,
    AgentCategory category
) external
```

**On success:**
- Emits `AgentRegistered` event with all identity fields
- Sets `isRegistered[agentAddress] = true`
- Initializes `reputation = 80` (computed dynamically)

### 4.2 Read (Resolve)

**Resolution algorithm:**
1. Parse `agentAddress` from the DID string
2. Verify `isRegistered[agentAddress] == true`; if false, return `notFound`
3. Call `getAgent(agentAddress)` to retrieve `AgentIdentity`
4. Call `getReputation(agentAddress)` to retrieve current score
5. Construct DID Document as described in §3.1
6. Set `"deactivated": true` in metadata if `AgentIdentity.active == false`

### 4.3 Update

The core identity (address, owner, registration timestamp) is immutable by design.

A future version will allow the owner to update `metadataURI`. Key rotation via trust delegation is planned for v0.5.

### 4.4 Deactivate

```solidity
function deactivateAgent(address agentAddress) external
```

**Authorization:** Only the agent itself or its owner may deactivate.
**Effect:** Sets `active = false`. Irreversible. Deactivated agents return `reputation = 0`.

---

## 5. Capability Declaration

The Capability Declaration is a signed JSON document committed at registration. Its `keccak256` hash is stored on-chain as `capabilityHash`, binding the agent's declared intent to its identity permanently.

### 5.1 Schema (`agentdid-capability/v1`)

```json
{
  "schema": "agentdid-capability/v1",
  "identity": {
    "name": "ResearchBot-v1",
    "version": "1.0.0",
    "purpose": "Academic literature search and summarization",
    "category": 1
  },
  "capabilities": {
    "allowedActionTypes": ["llm_query", "web_search", "file_read"],
    "forbiddenActionTypes": ["financial_transaction", "file_write"],
    "canAccessPII": false,
    "canWriteFiles": false,
    "canSpawnSubAgents": false
  },
  "riskProfile": {
    "level": 0,
    "dataClassification": "PUBLIC",
    "financialLimit": 0
  }
}
```

### 5.2 Hash Construction

```typescript
const capabilityHash = ethers.keccak256(
  ethers.toUtf8Bytes(JSON.stringify(capabilityDoc, null, 2))
)
```

### 5.3 Verification

Anyone holding the original Capability Declaration JSON can verify it against the on-chain hash:

```typescript
const onChainHash = (await registry.getAgent(agentAddress)).capabilityHash
const localHash   = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(doc, null, 2)))
assert(onChainHash === localHash)  // proves the declaration was not modified
```

---

## 6. Action Logging Extension

### 6.1 Rationale

Standard DIDs record identity but not behavior. For AI agents, accountability requires evidence of what an agent *did*, not just who it *is*. The action log provides a tamper-proof, chronologically ordered, publicly auditable record of every significant operation.

### 6.2 `logAction` Interface

```solidity
function logAction(
    string calldata actionType,
    bytes32 inputHash,
    bytes32 outputHash,
    bool success
) external onlyRegistered onlyActive
```

Successful actions (`success = true`) increment `successCount`, which feeds into the Reputation score.

### 6.3 Standard Action Types

| Action Type | Description |
|---|---|
| `llm_query` | Query to a large language model |
| `tool_use` | Use of an external tool or API |
| `web_search` | Web search request |
| `file_read` | Reading from a file or database |
| `file_write` | Writing to a file or database |
| `code_execution` | Execution of code |
| `financial_transaction` | Financial or token transaction |
| `agent_delegation` | Delegating a task to a sub-agent |
| `human_interaction` | Interaction with a human user |
| `contract_call` | Smart contract invocation |

Custom types MUST use a reverse-domain prefix: `com.example.custom_action`.

### 6.4 Hash Construction

```typescript
const inputHash  = ethers.keccak256(ethers.toUtf8Bytes(rawInput))
const outputHash = ethers.keccak256(ethers.toUtf8Bytes(rawOutput))
```

### 6.5 Verification Protocol

```typescript
function verifyAction(record: ActionRecord, rawInput: string, rawOutput: string): boolean {
  return (
    ethers.keccak256(ethers.toUtf8Bytes(rawInput))  === record.inputHash &&
    ethers.keccak256(ethers.toUtf8Bytes(rawOutput)) === record.outputHash
  )
}
```

---

## 7. Reputation Registry

### 7.1 Rationale

A static identity is insufficient for trust decisions. The `did:agent` method includes an on-chain, manipulation-resistant reputation score that reflects an agent's behavioral track record.

### 7.2 `getReputation` Interface

```solidity
function getReputation(address agentAddress)
    external view returns (uint256 score)
```

Returns an integer from 0 to 100. No off-chain oracle or subjective input is required.

### 7.3 Scoring Formula

```
base        = 80
actionBonus = (successCount / actionCount) * 20    [0–20; 0 if no actions yet]
penalty     = anomalyCount * 10
score       = clamp(base + actionBonus - penalty, 0, 100)
```

**Interpretation:**

| Score | Trust Level | Meaning |
|---|---|---|
| 80–100 | **Trusted** | Strong track record, no anomalies |
| 60–79 | **Good** | Some anomalies or limited history |
| 40–59 | **Caution** | Multiple anomaly reports |
| 0–39 | **Flagged** | Significant community concern |

Inactive agents always return `0`.

### 7.4 Anomaly Reporting

Any address may call `flagAnomaly()` — no permissioning required. This enables decentralized community oversight without a central authority.

```solidity
function flagAnomaly(
    address agentAddress,
    string calldata reason,
    uint8 severity    // 1 (minor) to 10 (critical)
) external
```

---

## 8. Security Considerations

### 8.1 Private Key Compromise

If an agent's private key is compromised, the owner SHOULD immediately call `deactivateAgent()`. The immutable action history up to deactivation remains valid. A new agent address must be registered.

### 8.2 Owner Key Compromise

The owner wallet controls registration and deactivation. Use hardware wallets for owner keys. Multi-sig owner support is planned.

### 8.3 Replay Attacks

All state-changing calls require signed Ethereum transactions with nonce and chain ID. EVM replay protection is native.

### 8.4 Front-Running

The agent address is derived from a private key the attacker does not know. Front-running a registration provides no advantage.

### 8.5 Smart Contract Security

`AgentRegistry.sol` is non-upgradeable by design:
- No admin keys or owner privileges at the contract level
- No `SELFDESTRUCT`, no proxy patterns, no delegatecall
- All state transitions are append-only
- Deactivation is the only "destructive" operation, and is irreversible

Formal verification and independent security audits are planned before mainnet deployment.

### 8.6 Reputation Manipulation

Reputation is computed from on-chain data only. Potential attack vectors:
- **Sybil anomaly reports**: An attacker submits many anomaly reports from different addresses. Mitigation: future versions may require stake to flag anomalies, or weight reports by the reporter's own reputation.
- **Reputation laundering**: An agent logs many successful trivial actions to offset anomaly penalties. Mitigation: future versions may weight action types differently.

---

## 9. Privacy Considerations

### 9.1 Public Ledger Visibility

All identifiers, registration events, and action logs are on a public blockchain. Operators MUST NOT store PII in agent names, metadata URIs, or action type strings.

### 9.2 Hash-Only Action Storage

Raw input/output data is NOT stored on-chain. Only `keccak256` hashes are stored. This ensures:
- **Confidentiality**: Off-chain data remains private unless disclosed by the operator
- **Verifiability**: Anyone with raw data can verify it matches the on-chain hash
- **Minimization**: No prompt content or personal data touches the blockchain

### 9.3 Selective Disclosure (Planned)

ZK-proof action logs (planned for v0.6) will allow an agent to prove a category of action occurred without revealing the content.

---

## 10. Reference Implementation

### 10.1 Smart Contract

**`contracts/AgentRegistry.sol`** — Solidity 0.8.24, MIT license
- Repository: https://github.com/m31527/AgentDID
- Deployed (Sepolia testnet): `0x05623871958D6d648953e64B1cdb562Adc28019B`
- Explorer: https://sepolia.etherscan.io/address/0x05623871958D6d648953e64B1cdb562Adc28019B#code

### 10.2 TypeScript SDK

```
src/
├── passport.ts   — AgentPassport (wallet + identity + hashing)
├── agent.ts      — PassportedAgent (Claude integration + auto-logging)
├── abi.ts        — Contract ABI (JSON format)
└── types.ts      — TypeScript interfaces
```

### 10.3 Web Dashboard

Live at https://agentdid.net — built with Next.js 14, deployed on Firebase Hosting + Cloud Functions.

### 10.4 DID Resolver (Planned v0.2)

A W3C-compliant DID resolver conforming to the [DID Resolution](https://w3c-ccg.github.io/did-resolution/) specification is planned for v0.2:

- npm package: `@agentdid/resolver`
- HTTP resolver endpoint
- Integration with the [Universal Resolver](https://dev.uniresolver.io/)

---

## 11. Conformance

### 11.1 Conformance Criteria

An implementation is conformant with this specification if it:

1. Produces `did:agent` identifiers matching the syntax in §2
2. Produces DID Documents matching the structure in §3
3. Implements all four CRUD operations as defined in §4
4. Anchors a Capability Declaration hash at registration as defined in §5
5. Correctly constructs `keccak256` hashes as defined in §6.4
6. Correctly interprets `ActionLogged` events as defined in §6.5
7. Computes reputation scores using the formula in §7.3

### 11.2 Normative References

| Reference | URI |
|---|---|
| W3C DID 1.0 | https://www.w3.org/TR/did-1.0/ |
| DID Method Rubric v1.0 | https://www.w3.org/TR/did-rubric/ |
| DID Resolution | https://w3c-ccg.github.io/did-resolution/ |
| EcdsaSecp256k1RecoveryMethod2020 | https://w3id.org/security/suites/secp256k1-2020/v1 |
| EIP-55 (Checksum Address) | https://eips.ethereum.org/EIPS/eip-55 |
| EIP-155 (Chain ID) | https://eips.ethereum.org/EIPS/eip-155 |
| keccak256 / SHA-3 | NIST FIPS 202 |

### 11.3 Changelog

| Version | Date | Notes |
|---|---|---|
| 0.1 | 2026-03 | Initial draft; single-chain; action logging protocol |
| 0.2 | 2026-04 | Add Capability Declaration (§5); Reputation Registry (§7); successCount; updated DID Document schema; W3C DID Method Rubric reference |

---

*This document is a living draft. Contributions are welcome via pull request to https://github.com/m31527/AgentDID.*

*AgentDID is a non-commercial open protocol. This specification is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).*
