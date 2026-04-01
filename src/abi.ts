/**
 * ABI for the AgentRegistry smart contract.
 * Keep in sync with contracts/AgentRegistry.sol
 */
export const AGENT_REGISTRY_ABI = [
  // ── Registration ──────────────────────────────────────────────────────────
  {
    name: "registerAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentAddress",   type: "address" },
      { name: "name",           type: "string"  },
      { name: "version",        type: "string"  },
      { name: "metadataURI",    type: "string"  },
      { name: "capabilityHash", type: "bytes32" },
      { name: "riskLevel",      type: "uint8"   },
      { name: "category",       type: "uint8"   },
    ],
    outputs: [],
  },

  // ── Action Logging ─────────────────────────────────────────────────────────
  {
    name: "logAction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "actionType",  type: "string"  },
      { name: "inputHash",   type: "bytes32" },
      { name: "outputHash",  type: "bytes32" },
      { name: "success",     type: "bool"    },
    ],
    outputs: [],
  },

  // ── Anomaly Reporting ──────────────────────────────────────────────────────
  {
    name: "flagAnomaly",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentAddress", type: "address" },
      { name: "reason",       type: "string"  },
      { name: "severity",     type: "uint8"   },
    ],
    outputs: [],
  },

  // ── View ───────────────────────────────────────────────────────────────────
  {
    name: "getAgent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentAddress", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "name",           type: "string"  },
          { name: "version",        type: "string"  },
          { name: "owner",          type: "address" },
          { name: "registeredAt",   type: "uint256" },
          { name: "active",         type: "bool"    },
          { name: "metadataURI",    type: "string"  },
          { name: "actionCount",    type: "uint256" },
          { name: "capabilityHash", type: "bytes32" },
          { name: "riskLevel",      type: "uint8"   },
          { name: "category",       type: "uint8"   },
          { name: "anomalyCount",   type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },

  // ── Management ─────────────────────────────────────────────────────────────
  {
    name: "deactivateAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentAddress", type: "address" }],
    outputs: [],
  },

  // ── Events ─────────────────────────────────────────────────────────────────
  {
    name: "AgentRegistered",
    type: "event",
    inputs: [
      { name: "agentAddress",   type: "address", indexed: true  },
      { name: "name",           type: "string",  indexed: false },
      { name: "version",        type: "string",  indexed: false },
      { name: "owner",          type: "address", indexed: true  },
      { name: "timestamp",      type: "uint256", indexed: false },
      { name: "metadataURI",    type: "string",  indexed: false },
      { name: "capabilityHash", type: "bytes32", indexed: false },
      { name: "riskLevel",      type: "uint8",   indexed: false },
      { name: "category",       type: "uint8",   indexed: false },
    ],
  },
  {
    name: "ActionLogged",
    type: "event",
    inputs: [
      { name: "agentAddress",  type: "address", indexed: true  },
      { name: "actionIndex",   type: "uint256", indexed: true  },
      { name: "actionType",    type: "string",  indexed: false },
      { name: "inputHash",     type: "bytes32", indexed: false },
      { name: "outputHash",    type: "bytes32", indexed: false },
      { name: "success",       type: "bool",    indexed: false },
      { name: "timestamp",     type: "uint256", indexed: false },
    ],
  },
  {
    name: "AgentDeactivated",
    type: "event",
    inputs: [
      { name: "agentAddress", type: "address", indexed: true  },
      { name: "timestamp",    type: "uint256", indexed: false },
    ],
  },
  {
    name: "AnomalyFlagged",
    type: "event",
    inputs: [
      { name: "agentAddress", type: "address", indexed: true  },
      { name: "reporter",     type: "address", indexed: true  },
      { name: "reason",       type: "string",  indexed: false },
      { name: "severity",     type: "uint8",   indexed: false },
      { name: "timestamp",    type: "uint256", indexed: false },
    ],
  },
] as const;
