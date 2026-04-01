// ============ Enums ============

export enum RiskLevel {
  LOW      = 0,
  MEDIUM   = 1,
  HIGH     = 2,
  CRITICAL = 3,
}

export enum AgentCategory {
  GENERAL        = 0,
  RESEARCH       = 1,
  FINANCE        = 2,
  MEDICAL        = 3,
  LEGAL          = 4,
  INFRASTRUCTURE = 5,
  SOCIAL         = 6,
}

// ============ Standard Action Types ============

export const STANDARD_ACTION_TYPES = [
  "llm_query",
  "tool_use",
  "web_search",
  "file_read",
  "file_write",
  "code_execution",
  "financial_transaction",
  "agent_delegation",
  "human_interaction",
  "contract_call",
] as const;

export type StandardActionType = typeof STANDARD_ACTION_TYPES[number];

// ============ Capability Declaration ============

/** Operator contact info — email stored as sha256 hash, never plaintext */
export interface OperatorInfo {
  organization?: string;
  /** sha256 hash of the operator email — verifiable but not reversible */
  contactEmailHash?: string;
  jurisdiction?: string;
  /** DID of the organization, if any */
  organizationDID?: string;
}

/** What the agent is and is not allowed to do */
export interface Capabilities {
  /** Action types this agent is permitted to perform */
  allowedActionTypes: string[];
  /** Action types explicitly forbidden — used for anomaly detection */
  forbiddenActionTypes?: string[];
  /** Allowlist of external domains/APIs the agent may contact */
  allowedDomains?: string[];
  /** Maximum actions per hour before rate-limit alerts fire */
  maxActionsPerHour?: number;
  /** Maximum actions per day */
  maxActionsPerDay?: number;
  canAccessPII?: boolean;
  canWriteFiles?: boolean;
  canSpawnSubAgents?: boolean;
  /** Actions that must be approved by a human before execution */
  requiresHumanApproval?: string[];
}

/** Risk classification metadata */
export interface RiskProfile {
  level: RiskLevel;
  /** PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED */
  dataClassification?: string;
  /** Maximum financial value (in USD) the agent may transact. 0 = none */
  financialLimit?: number;
}

/** Statistical baseline for normal operation — used for anomaly detection */
export interface BehavioralBaseline {
  primaryLanguage?: string;
  /** Expected distribution of action types (values should sum to ~1.0) */
  expectedActionDistribution?: Record<string, number>;
  /** Typical active hours (UTC) e.g. [8, 20] */
  activeHoursUTC?: [number, number];
}

/**
 * Full capability declaration document.
 * This JSON is stored off-chain (IPFS), and its keccak256 hash is stored
 * on-chain in AgentIdentity.capabilityHash — proving the document is authentic.
 */
export interface CapabilityDeclaration {
  schema: "agentdid-capability/v1";
  identity: {
    name: string;
    version: string;
    purpose: string;
    category: AgentCategory;
  };
  operator?: OperatorInfo;
  capabilities: Capabilities;
  riskProfile: RiskProfile;
  behavioralBaseline?: BehavioralBaseline;
}

// ============ Agent Identity ============

export interface AgentIdentity {
  name: string;
  version: string;
  owner: string;
  registeredAt: bigint;
  active: boolean;
  metadataURI: string;
  actionCount: bigint;
  capabilityHash: string;
  riskLevel: number;        // corresponds to RiskLevel enum
  category: number;         // corresponds to AgentCategory enum
  anomalyCount: bigint;
}

// ============ Action Records ============

/** Reconstructed from on-chain ActionLogged events */
export interface ActionRecord {
  agentAddress: string;
  actionIndex: bigint;
  actionType: string;
  inputHash: string;
  outputHash: string;
  success: boolean;
  timestamp: bigint;
  blockNumber: bigint;
  txHash: string;
}

// ============ Anomaly Reports ============

/** Reconstructed from on-chain AnomalyFlagged events */
export interface AnomalyReport {
  agentAddress: string;
  reporter: string;
  reason: string;
  severity: number;
  timestamp: bigint;
  blockNumber: bigint;
  txHash: string;
}

// ============ Risk Analysis ============

export interface RiskAnalysis {
  agentAddress: string;
  totalActions: number;
  anomalyCount: number;
  /** Actions that were NOT in the agent's declared allowedActionTypes */
  unauthorizedActionTypes: string[];
  /** Detected action type distribution from on-chain history */
  observedActionDistribution: Record<string, number>;
  /** Deviation from baseline distribution (if baseline was declared) */
  distributionDeviation?: Record<string, number>;
  overallRiskScore: number;   // 0.0 – 1.0
  alerts: string[];
}

// ============ Configuration ============

export interface ContractConfig {
  /** Deployed AgentRegistry contract address */
  registryAddress: string;
  /** JSON-RPC endpoint URL */
  rpcUrl: string;
}

export interface AgentConfig {
  /** Human-readable name for the agent */
  name: string;
  /** Semantic version string */
  version: string;
  /** Full capability declaration — defines what this agent is allowed to do */
  capabilities: CapabilityDeclaration;
  /** Override for metadataURI; if omitted, a local JSON file path is used */
  metadataURI?: string;
}
