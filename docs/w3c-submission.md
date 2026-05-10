# W3C DID Methods Registry — Submission Guide

This document explains how to submit the `did:agent` method to the
[W3C DID Specification Registries](https://github.com/w3c/did-spec-registries).

---

## What You're Submitting

The W3C maintains a public registry of DID methods at:
https://www.w3.org/TR/did-extensions-methods/

Getting `did:agent` listed there means:
- Official recognition as a W3C-registered DID method
- Listed alongside `did:web`, `did:key`, `did:ethr`, etc.
- Credibility signal for developers, enterprises, and regulators

---

## Submission Entry (JSON)

This is the exact JSON entry to add to the W3C registry. Copy this block when submitting:

```json
{
  "name": "agent",
  "status": "provisional",
  "verifiedBy": "W3C DID WG",
  "specification": "https://github.com/m31527/AgentDID/blob/main/docs/did-spec.md",
  "contact": "https://github.com/m31527/AgentDID/issues",
  "notes": "Decentralized identity protocol for AI agents and autonomous systems. Extends W3C DID 1.0 with Capability Declaration (pre-declared agent intent), Action Logging (tamper-proof on-chain audit trail), and Reputation Registry (algorithmic trust score). Non-commercial, MIT licensed. Reference implementation deployed on Ethereum Sepolia testnet."
}
```

---

## Step-by-Step Submission

### Step 1 — Fork the W3C registry

Go to: https://github.com/w3c/did-spec-registries
Click **Fork** → fork to your account (`m31527`)

### Step 2 — Clone your fork

```bash
git clone https://github.com/m31527/did-spec-registries
cd did-spec-registries
```

### Step 3 — Add the entry

Open `did-methods/a.json` (entries are sorted alphabetically by method name).

Find the correct alphabetical position for `"agent"` and insert:

```json
{
  "name": "agent",
  "status": "provisional",
  "verifiedBy": "W3C DID WG",
  "specification": "https://github.com/m31527/AgentDID/blob/main/docs/did-spec.md",
  "contact": "https://github.com/m31527/AgentDID/issues",
  "notes": "Decentralized identity protocol for AI agents and autonomous systems. Extends W3C DID 1.0 with Capability Declaration, Action Logging, and Reputation Registry. Non-commercial, MIT licensed."
}
```

### Step 4 — Commit and push

```bash
git add did-methods/a.json
git commit -m "Add did:agent method — decentralized AI agent identity"
git push origin main
```

### Step 5 — Open a Pull Request

Go to: https://github.com/w3c/did-spec-registries/pulls
Click **New pull request** → compare across forks → select your fork.

**PR Title:**
```
Add did:agent — Decentralized identity method for AI agents
```

**PR Body:**
```markdown
## Summary

This PR adds the `did:agent` DID method to the W3C registry.

`did:agent` is an open, non-commercial decentralized identity protocol
for AI agents and autonomous systems.

**Specification:** https://github.com/m31527/AgentDID/blob/main/docs/did-spec.md
**Reference Implementation:** https://github.com/m31527/AgentDID
**Live Demo:** https://agentdid.web.app
**Deployed Contract (Sepolia):** `0x05623871958D6d648953e64B1cdb562Adc28019B`

## What makes did:agent unique

Compared to existing DID methods, `did:agent` adds three primitives
not found in any registered DID method:

1. **Capability Declaration** — a signed, hash-anchored JSON document
   committed at registration declaring what actions the agent is and
   is not permitted to perform.

2. **Action Logging** — every agent action anchors an input/output
   keccak256 hash on-chain, creating a tamper-proof, community-
   auditable behavioral record.

3. **Reputation Registry** — an on-chain algorithmic trust score (0–100)
   computed from action success rate and community anomaly reports,
   requiring no off-chain oracle.

## W3C DID 1.0 Compliance

The method implements all four CRUD operations (Create, Read, Update,
Deactivate) as required by W3C DID 1.0. The specification references
the DID Method Rubric v1.0.

## License

The specification is released under CC BY 4.0.
The reference implementation is MIT licensed.
```

---

## After Submission

The W3C DID WG typically reviews PRs within 2–4 weeks. They may request:
- Clarifications on the spec
- Changes to the registry entry format
- Evidence of implementation (point to the live demo + Etherscan)

Once merged, `did:agent` will appear at:
https://www.w3.org/TR/did-extensions-methods/#agent

---

## Checklist Before Submitting

- [ ] `did-spec.md` is complete and publicly accessible on GitHub
- [ ] Reference implementation is live (https://agentdid.web.app)
- [ ] Contract is deployed and verified on a public testnet
- [ ] Spec covers all four CRUD operations
- [ ] Spec references W3C DID 1.0 and DID Method Rubric
- [ ] Contact/issues URL is valid
