# did:agent Method Specification

**Status:** Draft v0.1
**Authors:** AgentDID Contributors
**Repository:** https://github.com/agentdid/agentdid
**W3C DID Methods Registry:** Pending submission

---

## Abstract

The `did:agent` DID method defines a decentralized identifier scheme for AI agents and autonomous robots. It anchors each agent's identity to a cryptographic Ethereum address recorded on an EVM-compatible public blockchain, enabling any party to resolve, verify, and audit an agent's identity and action history without requiring permission from any centralized authority.

This document conforms to the [W3C Decentralized Identifiers (DID) 1.0](https://www.w3.org/TR/did-1.0/) specification.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [DID Method Syntax](#2-did-method-syntax)
3. [DID Document](#3-did-document)
4. [CRUD Operations](#4-crud-operations)
   - 4.1 [Create (Register)](#41-create-register)
   - 4.2 [Read (Resolve)](#42-read-resolve)
   - 4.3 [Update](#43-update)
   - 4.4 [Deactivate](#44-deactivate)
5. [Security Considerations](#5-security-considerations)
6. [Privacy Considerations](#6-privacy-considerations)
7. [Action Logging Extension](#7-action-logging-extension)
8. [Reference Implementation](#8-reference-implementation)
9. [Conformance](#9-conformance)

---

## 1. Introduction

### 1.1 Motivation

The rapid proliferation of AI agents and autonomous systems creates an urgent need for a shared, open identity layer. Existing identity systems were designed for human users; they lack:

- **Accountability primitives** for recording agent actions
- **Non-commercial governance** free from single-party control
- **Cross-jurisdictional operation** without regulatory capture
- **Cryptographic verifiability** of every claimed action

The `did:agent` method addresses these gaps by combining the W3C DID standard with EVM smart contract infrastructure and an action-logging protocol extension.

### 1.2 Design Goals

| Goal | Mechanism |
|---|---|
| Decentralization | Ethereum address as identity anchor; no central registry |
| Immutability | Non-upgradeable `AgentRegistry.sol` |
| Auditability | On-chain `ActionLogged` events with keccak256 proof |
| Gas efficiency | Hashes only; raw data stored off-chain |
| Interoperability | W3C DID 1.0 compliant; EVM-compatible |
| Non-commerciality | MIT license; no token; no VC funding |

### 1.3 Terminology

| Term | Definition |
|---|---|
| **Agent** | An AI system, autonomous robot, or software process that acts on behalf of principals |
| **Owner** | The human or organization that registers and controls an agent |
| **Passport** | The combination of a `did:agent` identifier and its on-chain DID Document |
| **Action** | Any discrete operation performed by an agent (query, tool use, transaction, etc.) |
| **Action Log** | The immutable sequence of `ActionLogged` events on-chain for a given agent |

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
      "serviceEndpoint": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
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
    "actionCount": 42
  }
}
```

### 3.2 DID Document Properties

#### Standard Properties

| Property | Value |
|---|---|
| `@context` | W3C DID v1, secp256k1-2020, agentdid context |
| `id` | The `did:agent` identifier |
| `controller` | Same as `id` (self-sovereign) |
| `verificationMethod` | Single secp256k1 key derived from the agent address |
| `authentication` | References `#key-1` |
| `assertionMethod` | References `#key-1` |
| `service` | Registry contract address + optional metadata URI |

#### AgentDID Extension (`agentDID`)

The `agentDID` property is a non-standard extension carrying agent-specific metadata from the registry contract:

| Field | Type | Description |
|---|---|---|
| `name` | string | Human-readable agent name |
| `version` | string | Semantic version |
| `owner` | address | Registering owner's Ethereum address |
| `registeredAt` | integer | Unix timestamp of registration |
| `active` | boolean | Whether the agent is currently active |
| `actionCount` | integer | Total actions logged on-chain |

---

## 4. CRUD Operations

### 4.1 Create (Register)

An agent identity is created by calling `registerAgent()` on the `AgentRegistry` contract.

**Contract call:**
```solidity
function registerAgent(
    address agentAddress,    // The agent's Ethereum address
    string calldata name,    // Human-readable name
    string calldata version, // Semantic version
    string calldata metadataURI // Optional IPFS/HTTPS URI
) external
```

**Requirements:**
- `agentAddress` MUST be a non-zero Ethereum address
- `agentAddress` MUST NOT already be registered
- `name` MUST be non-empty
- The transaction MUST be signed by the owner's wallet

**On success:**
- Emits `AgentRegistered(agentAddress, name, version, owner, timestamp, metadataURI)`
- Sets `isRegistered[agentAddress] = true`
- Creates `AgentIdentity` struct in storage

**TypeScript example:**
```typescript
const passport = await AgentPassport.create(config);
await passport.register("ResearchBot-v1", "1.0.0", "ipfs://Qm...");
// Agent DID: did:agent:0x...
```

### 4.2 Read (Resolve)

Resolution queries the `AgentRegistry` contract and constructs a DID Document.

**Contract call:**
```solidity
function getAgent(address agentAddress)
    external view
    returns (AgentIdentity memory)
```

**Resolution algorithm:**
1. Parse `agentAddress` from the DID string
2. Verify `isRegistered[agentAddress] == true`; if false, return `notFound` error
3. Call `getAgent(agentAddress)` to retrieve `AgentIdentity`
4. Query `ActionLogged` events to retrieve `actionCount` (or use `AgentIdentity.actionCount`)
5. Construct DID Document as described in §3.1
6. Return DID Document with `deactivated: true` if `AgentIdentity.active == false`

**DID Resolution Metadata:**
```json
{
  "contentType": "application/did+ld+json",
  "retrieved": "2024-03-01T12:00:00Z"
}
```

### 4.3 Update

The `did:agent` method supports limited updates:

#### Update Metadata URI (Planned)

A future version will allow the owner to update the `metadataURI` field pointing to off-chain metadata. The core identity (address, owner, registration timestamp) is immutable by design.

#### Key Rotation (Planned v0.5)

Trust delegation (planned for v0.5) will allow an agent to authorize a new address, effectively enabling key rotation while preserving audit history continuity.

**Current behavior:** The agent address (and therefore the DID) is permanent once registered. There is no `update` function in v0.1.

### 4.4 Deactivate

An agent is deactivated by calling `deactivateAgent()`.

**Contract call:**
```solidity
function deactivateAgent(address agentAddress) external
```

**Authorization:** Only the agent itself (`msg.sender == agentAddress`) or the owner (`msg.sender == agent.owner`) may deactivate.

**Effect:**
- Sets `AgentIdentity.active = false`
- Emits `AgentDeactivated(agentAddress, timestamp)`
- Deactivated agents cannot call `logAction()`
- DID Document resolver SHOULD include `"deactivated": true` in DID Document Metadata

**This operation is irreversible.** Immutability is a core protocol guarantee — an agent cannot be re-activated once deactivated. This is intentional: it prevents an agent from resuming activity after a security incident.

---

## 5. Security Considerations

### 5.1 Private Key Compromise

The agent's Ethereum private key is the root of its identity. If compromised:

1. The owner SHOULD immediately call `deactivateAgent()` to halt further action logging
2. The immutable action history up to deactivation remains valid and auditable
3. A new agent address must be registered; continuity of identity is not preserved in v0.1

**Mitigation (planned):** Trust delegation (v0.5) and hardware security module (HSM) integration guides.

### 5.2 Owner Key Compromise

The owner wallet controls registration and deactivation. Owner key compromise could allow:
- Unauthorized deactivation of legitimate agents
- Cannot modify past action logs (immutable events)

**Mitigation:** Use hardware wallets for owner keys. Multi-sig owner support is planned.

### 5.3 Replay Attacks

All state-changing contract calls require signed Ethereum transactions with nonce and chain ID. EVM replay protection prevents transaction replay across sessions or chains.

### 5.4 Front-Running

Registration transactions are visible in the mempool before mining. An attacker could theoretically front-run a registration attempt to claim an address. However:
- The agent address is a public key derived from a private key the attacker cannot know
- Front-running a random address provides no advantage to the attacker

### 5.5 Smart Contract Security

`AgentRegistry.sol` is non-upgradeable by design. Security properties:
- No admin keys or owner privileges at the contract level
- No `SELFDESTRUCT`, no proxy patterns, no delegatecall
- All state transitions are append-only (registration + action log)
- Deactivation is the only "destructive" operation, and it cannot be reversed

**Formal verification and independent security audits are planned before mainnet deployment.**

### 5.6 Hash Collision Resistance

Action integrity is based on `keccak256`. Keccak-256 provides 256-bit collision resistance. No practical preimage or collision attacks are known. This is the same hash function used to derive Ethereum addresses and in the EVM itself.

---

## 6. Privacy Considerations

### 6.1 Public Ledger Visibility

All `did:agent` identifiers, registration events, and action logs are stored on a public blockchain. They are visible to anyone with access to an Ethereum node.

**Operators MUST NOT store personally identifiable information (PII) in:**
- Agent names
- Metadata URIs that resolve to PII
- Action type strings

### 6.2 Hash-Only Action Storage

Raw action input/output data is NOT stored on-chain. Only `keccak256(rawData)` is stored. This provides:
- **Confidentiality**: Off-chain data remains private unless disclosed by the operator
- **Verifiability**: Anyone holding the raw data can verify it matches the on-chain hash
- **Minimization**: No personal data or prompt content touches the blockchain

### 6.3 Metadata URI Privacy

The `metadataURI` field is optional and public. If used, it SHOULD NOT resolve to documents containing PII. IPFS content-addressed URIs are preferred over mutable HTTPS endpoints.

### 6.4 Selective Disclosure (Planned)

ZK-proof action logs (planned for v0.6) will allow an agent to prove it performed a category of action (e.g., "queried a medical database") without revealing the query content, enabling privacy-preserving compliance.

---

## 7. Action Logging Extension

The `did:agent` method extends the W3C DID framework with an **action logging protocol** unique to autonomous agent identity.

### 7.1 Rationale

Standard DIDs record identity but not behavior. For AI agents, accountability requires evidence of what an agent *did*, not just who it *is*. The action log provides a tamper-proof, chronologically ordered, publicly auditable record of every significant operation.

### 7.2 `logAction` Interface

```solidity
function logAction(
    string calldata actionType,  // Category (see §7.3)
    bytes32 inputHash,           // keccak256(abi.encodePacked(rawInput))
    bytes32 outputHash,          // keccak256(abi.encodePacked(rawOutput))
    bool success                 // Whether the action completed successfully
) external onlyRegistered onlyActive
```

### 7.3 Standard Action Types

The following action type strings are defined by this specification. Implementations SHOULD use these values; custom types MUST use a reverse-domain prefix (e.g., `com.example.custom_action`).

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

### 7.4 Hash Construction

```typescript
// TypeScript reference implementation
import { ethers } from "ethers";

const inputHash  = ethers.keccak256(ethers.toUtf8Bytes(rawInput));
const outputHash = ethers.keccak256(ethers.toUtf8Bytes(rawOutput));
```

For binary data:
```typescript
const inputHash = ethers.keccak256(binaryBuffer);
```

### 7.5 ActionLogged Event Schema

```solidity
event ActionLogged(
    address indexed agentAddress,  // The agent that performed the action
    uint256 indexed actionIndex,   // Sequential index (0-based)
    string actionType,             // From §7.3
    bytes32 inputHash,             // Hash of input
    bytes32 outputHash,            // Hash of output
    bool success,                  // Outcome
    uint256 timestamp              // block.timestamp
);
```

### 7.6 Verification Protocol

To verify that an on-chain action record corresponds to known data:

```typescript
function verifyAction(record: ActionRecord, rawInput: string, rawOutput: string): boolean {
  const inputHash  = ethers.keccak256(ethers.toUtf8Bytes(rawInput));
  const outputHash = ethers.keccak256(ethers.toUtf8Bytes(rawOutput));
  return inputHash === record.inputHash && outputHash === record.outputHash;
}
```

A mismatch indicates either:
1. The wrong raw data was provided (not the original), or
2. The raw data has been tampered with since the action was logged

---

## 8. Reference Implementation

### 8.1 Smart Contract

**`contracts/AgentRegistry.sol`** — Solidity 0.8.24, MIT license
Repository: https://github.com/agentdid/agentdid
Deployed (Sepolia testnet): *pending*

### 8.2 TypeScript SDK

```
src/
├── passport.ts   — AgentPassport (wallet + identity + hashing)
├── agent.ts      — PassportedAgent (Claude integration + auto-logging)
├── abi.ts        — Contract ABI (JSON format)
└── types.ts      — TypeScript interfaces
```

### 8.3 DID Resolver (Planned)

A W3C-compliant DID resolver conforming to the [DID Resolution](https://w3c-ccg.github.io/did-resolution/) specification is planned for v0.2. It will be published as:

- An npm package: `@agentdid/resolver`
- A standalone HTTP resolver endpoint
- Integration with the [Universal Resolver](https://dev.uniresolver.io/)

---

## 9. Conformance

### 9.1 Conformance Criteria

An implementation is conformant with this specification if it:

1. Produces `did:agent` identifiers matching the syntax in §2
2. Produces DID Documents matching the structure in §3
3. Implements all four CRUD operations as defined in §4
4. Correctly constructs `keccak256` hashes as defined in §7.4
5. Correctly interprets `ActionLogged` events as defined in §7.5

### 9.2 Normative References

| Reference | URI |
|---|---|
| W3C DID 1.0 | https://www.w3.org/TR/did-1.0/ |
| DID Resolution | https://w3c-ccg.github.io/did-resolution/ |
| EcdsaSecp256k1RecoveryMethod2020 | https://w3id.org/security/suites/secp256k1-2020/v1 |
| EIP-55 (Checksum Address) | https://eips.ethereum.org/EIPS/eip-55 |
| EIP-155 (Chain ID) | https://eips.ethereum.org/EIPS/eip-155 |
| keccak256 / SHA-3 | NIST FIPS 202 |

### 9.3 Changelog

| Version | Date | Notes |
|---|---|---|
| 0.1 | 2024-03 | Initial draft; single-chain; action logging protocol |

---

*This document is a living draft. Contributions are welcome via pull request to https://github.com/agentdid/agentdid.*

*AgentDID is a non-commercial open protocol. This specification is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).*
