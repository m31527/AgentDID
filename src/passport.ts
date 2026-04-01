import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { AGENT_REGISTRY_ABI } from "./abi";
import {
  AgentIdentity,
  ActionRecord,
  AnomalyReport,
  RiskAnalysis,
  ContractConfig,
  CapabilityDeclaration,
  RiskLevel,
  AgentCategory,
} from "./types";

/**
 * AgentPassport
 *
 * Encapsulates an AI agent's Web3 identity and provides methods to:
 *  - Register the agent on-chain with a full capability declaration
 *  - Log every action as an on-chain event
 *  - Query the agent's immutable action history from chain events
 *  - Report and retrieve anomaly flags
 *  - Analyse on-chain behaviour against declared capabilities
 */
export class AgentPassport {
  private readonly wallet: ethers.Wallet;
  private readonly contract: ethers.Contract;

  constructor(
    connectedWallet: ethers.Wallet,
    contractAddress: string,
  ) {
    this.wallet   = connectedWallet;
    this.contract = new ethers.Contract(
      contractAddress,
      AGENT_REGISTRY_ABI,
      connectedWallet,
    );
  }

  // ── Factory ──────────────────────────────────────────────────────────────

  /**
   * Create a passport by connecting to a JSON-RPC node.
   * If privateKey is omitted, a fresh wallet is generated.
   */
  static async create(
    config: ContractConfig,
    privateKey?: string,
  ): Promise<AgentPassport> {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet   = privateKey
      ? new ethers.Wallet(privateKey, provider)
      : ethers.Wallet.createRandom().connect(provider);
    return new AgentPassport(wallet as ethers.Wallet, config.registryAddress);
  }

  // ── Identity ─────────────────────────────────────────────────────────────

  get address(): string { return this.wallet.address; }
  get privateKey(): string { return this.wallet.privateKey; }

  async isRegistered(): Promise<boolean> {
    return this.contract.isRegistered(this.wallet.address) as Promise<boolean>;
  }

  /**
   * Register this agent on-chain with a full capability declaration.
   *
   * The capability declaration JSON is written to a local file (capabilities/<address>.json)
   * and its keccak256 hash is stored on-chain — proving the document is authentic.
   *
   * @param name         Human-readable name
   * @param version      Semantic version
   * @param capabilities Full capability declaration object
   * @param metadataURI  Optional explicit URI (IPFS CID, HTTPS). If omitted, a local path is used.
   */
  async register(
    name: string,
    version: string,
    capabilities: CapabilityDeclaration,
    metadataURI = "",
  ): Promise<void> {
    if (await this.isRegistered()) {
      console.log(`[Passport] Already registered: ${this.wallet.address}`);
      return;
    }

    // Serialize capability declaration and compute hash
    const capJson         = JSON.stringify(capabilities, null, 2);
    const capabilityHash  = ethers.keccak256(ethers.toUtf8Bytes(capJson));

    // Persist capability declaration locally for offline verification
    const capDir  = path.join(process.cwd(), "capabilities");
    if (!fs.existsSync(capDir)) fs.mkdirSync(capDir, { recursive: true });
    const capFile = path.join(capDir, `${this.wallet.address}.json`);
    fs.writeFileSync(capFile, capJson, "utf-8");
    console.log(`[Passport] Capability declaration saved → ${capFile}`);

    const uri = metadataURI || `file://${capFile}`;

    const tx = await this.contract.registerAgent(
      this.wallet.address,
      name,
      version,
      uri,
      capabilityHash,
      capabilities.riskProfile.level,
      capabilities.identity.category,
    );
    const receipt: ethers.TransactionReceipt = await tx.wait();
    console.log(`[Passport] Registered on-chain ✓`);
    console.log(`           TX:    ${receipt.hash}`);
    console.log(`           Block: ${receipt.blockNumber}`);
    console.log(`           capabilityHash: ${capabilityHash}`);
  }

  async getIdentity(): Promise<AgentIdentity> {
    const raw = await this.contract.getAgent(this.wallet.address);
    return {
      name:           raw.name,
      version:        raw.version,
      owner:          raw.owner,
      registeredAt:   raw.registeredAt,
      active:         raw.active,
      metadataURI:    raw.metadataURI,
      actionCount:    raw.actionCount,
      capabilityHash: raw.capabilityHash,
      riskLevel:      Number(raw.riskLevel),
      category:       Number(raw.category),
      anomalyCount:   raw.anomalyCount,
    };
  }

  // ── Action Logging ────────────────────────────────────────────────────────

  /**
   * Hash raw string data and record the action on-chain.
   * Returns the transaction hash.
   */
  async logAction(
    actionType: string,
    input: string,
    output: string,
    success: boolean,
  ): Promise<string> {
    const inputHash  = ethers.keccak256(ethers.toUtf8Bytes(input));
    const outputHash = ethers.keccak256(ethers.toUtf8Bytes(output));

    const tx = await this.contract.logAction(
      actionType,
      inputHash,
      outputHash,
      success,
    );
    const receipt: ethers.TransactionReceipt = await tx.wait();
    return receipt.hash;
  }

  // ── History ───────────────────────────────────────────────────────────────

  /**
   * Reconstruct the agent's full action history from on-chain events.
   */
  async getActionHistory(): Promise<ActionRecord[]> {
    const filter = this.contract.filters["ActionLogged"](this.wallet.address);
    const events  = await this.contract.queryFilter(filter);

    return events.map((evt: ethers.EventLog | ethers.Log) => {
      const e = evt as ethers.EventLog;
      return {
        agentAddress: e.args["agentAddress"] as string,
        actionIndex:  e.args["actionIndex"]  as bigint,
        actionType:   e.args["actionType"]   as string,
        inputHash:    e.args["inputHash"]    as string,
        outputHash:   e.args["outputHash"]   as string,
        success:      e.args["success"]      as boolean,
        timestamp:    e.args["timestamp"]    as bigint,
        blockNumber:  BigInt(e.blockNumber),
        txHash:       e.transactionHash,
      };
    });
  }

  // ── Anomaly Reporting ─────────────────────────────────────────────────────

  /**
   * Flag an anomaly for a registered agent.
   * Anyone can call this — this is how decentralised oversight works.
   *
   * @param agentAddress  The agent being reported
   * @param reason        Description of the anomaly
   * @param severity      1 (minor) to 10 (critical)
   */
  async flagAnomaly(
    agentAddress: string,
    reason: string,
    severity: number,
  ): Promise<string> {
    if (severity < 1 || severity > 10) throw new Error("Severity must be 1–10");
    const tx = await this.contract.flagAnomaly(agentAddress, reason, severity);
    const receipt: ethers.TransactionReceipt = await tx.wait();
    console.log(`[Passport] Anomaly flagged for ${agentAddress} (severity: ${severity}) → TX: ${receipt.hash}`);
    return receipt.hash;
  }

  /**
   * Get all anomaly reports for a given agent from on-chain events.
   */
  async getAnomalyReports(agentAddress: string): Promise<AnomalyReport[]> {
    const filter = this.contract.filters["AnomalyFlagged"](agentAddress);
    const events  = await this.contract.queryFilter(filter);

    return events.map((evt: ethers.EventLog | ethers.Log) => {
      const e = evt as ethers.EventLog;
      return {
        agentAddress: e.args["agentAddress"] as string,
        reporter:     e.args["reporter"]     as string,
        reason:       e.args["reason"]       as string,
        severity:     Number(e.args["severity"]),
        timestamp:    e.args["timestamp"]    as bigint,
        blockNumber:  BigInt(e.blockNumber),
        txHash:       e.transactionHash,
      };
    });
  }

  // ── Risk Analysis ─────────────────────────────────────────────────────────

  /**
   * Analyse on-chain action history against the agent's declared capability hash.
   * Loads the local capability declaration file if present.
   *
   * Returns a RiskAnalysis report with anomaly alerts and a risk score (0.0 – 1.0).
   */
  async analyzeRisk(): Promise<RiskAnalysis> {
    const identity  = await this.getIdentity();
    const history   = await this.getActionHistory();
    const anomalies = await this.getAnomalyReports(this.wallet.address);
    const alerts: string[] = [];

    // Load capability declaration from local file
    let capabilities: CapabilityDeclaration | null = null;
    const capFile = path.join(process.cwd(), "capabilities", `${this.wallet.address}.json`);
    if (fs.existsSync(capFile)) {
      const raw = fs.readFileSync(capFile, "utf-8");
      // Verify the file hasn't been tampered with
      const hash = ethers.keccak256(ethers.toUtf8Bytes(raw));
      if (hash.toLowerCase() === identity.capabilityHash.toLowerCase()) {
        capabilities = JSON.parse(raw) as CapabilityDeclaration;
      } else {
        alerts.push("CRITICAL: Local capability declaration hash mismatch — file may be tampered");
      }
    }

    // Build observed action distribution
    const observedCounts: Record<string, number> = {};
    for (const rec of history) {
      observedCounts[rec.actionType] = (observedCounts[rec.actionType] ?? 0) + 1;
    }
    const total = history.length || 1;
    const observedActionDistribution: Record<string, number> = {};
    for (const [k, v] of Object.entries(observedCounts)) {
      observedActionDistribution[k] = v / total;
    }

    // Check for unauthorized action types
    const unauthorizedActionTypes: string[] = [];
    if (capabilities) {
      const allowed  = new Set(capabilities.capabilities.allowedActionTypes);
      const forbidden = new Set(capabilities.capabilities.forbiddenActionTypes ?? []);

      for (const actionType of Object.keys(observedCounts)) {
        if (!allowed.has(actionType)) {
          unauthorizedActionTypes.push(actionType);
          alerts.push(`WARN: Action type "${actionType}" not in declared allowedActionTypes`);
        }
        if (forbidden.has(actionType)) {
          alerts.push(`CRITICAL: Forbidden action type "${actionType}" was executed`);
        }
      }

      // Check hourly rate (approximate from total actions and time span)
      if (capabilities.capabilities.maxActionsPerHour && history.length > 0) {
        const firstTs = Number(history[0].timestamp);
        const lastTs  = Number(history[history.length - 1].timestamp);
        const hours   = Math.max((lastTs - firstTs) / 3600, 1);
        const rate    = history.length / hours;
        if (rate > capabilities.capabilities.maxActionsPerHour) {
          alerts.push(`WARN: Action rate ${rate.toFixed(1)}/hr exceeds declared limit of ${capabilities.capabilities.maxActionsPerHour}/hr`);
        }
      }
    }

    // Distribution deviation from baseline
    let distributionDeviation: Record<string, number> | undefined;
    if (capabilities?.behavioralBaseline?.expectedActionDistribution) {
      const expected = capabilities.behavioralBaseline.expectedActionDistribution;
      distributionDeviation = {};
      for (const k of new Set([...Object.keys(expected), ...Object.keys(observedActionDistribution)])) {
        distributionDeviation[k] = Math.abs(
          (observedActionDistribution[k] ?? 0) - (expected[k] ?? 0)
        );
        if (distributionDeviation[k] > 0.3) {
          alerts.push(`WARN: Action type "${k}" distribution deviates ${(distributionDeviation[k] * 100).toFixed(0)}% from baseline`);
        }
      }
    }

    // Compute overall risk score (0.0 – 1.0)
    const baseScore       = identity.riskLevel / 3;                      // 0–1 from enum
    const anomalyPenalty  = Math.min(anomalies.length * 0.05, 0.3);      // +5% per anomaly, max 30%
    const unauthorizedPen = Math.min(unauthorizedActionTypes.length * 0.1, 0.4);
    const overallRiskScore = Math.min(baseScore + anomalyPenalty + unauthorizedPen, 1.0);

    if (overallRiskScore >= 0.8) alerts.push(`CRITICAL: Overall risk score ${overallRiskScore.toFixed(2)} — immediate review recommended`);
    else if (overallRiskScore >= 0.5) alerts.push(`WARN: Overall risk score ${overallRiskScore.toFixed(2)} — monitoring recommended`);

    return {
      agentAddress: this.wallet.address,
      totalActions: history.length,
      anomalyCount: anomalies.length,
      unauthorizedActionTypes,
      observedActionDistribution,
      distributionDeviation,
      overallRiskScore,
      alerts,
    };
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  async getBalance(): Promise<string> {
    const balance = await this.wallet.provider!.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  /**
   * Verify that a recorded hash matches the original raw data.
   */
  static verifyHash(rawData: string, recordedHash: string): boolean {
    const computed = ethers.keccak256(ethers.toUtf8Bytes(rawData));
    return computed.toLowerCase() === recordedHash.toLowerCase();
  }

  /**
   * Build a minimal capability declaration with sensible defaults.
   * Use this as a starting point and customise before registering.
   */
  static buildCapabilityDeclaration(opts: {
    name: string;
    version: string;
    purpose: string;
    category?: AgentCategory;
    allowedActionTypes?: string[];
    riskLevel?: RiskLevel;
    organization?: string;
  }): CapabilityDeclaration {
    return {
      schema: "agentdid-capability/v1",
      identity: {
        name:     opts.name,
        version:  opts.version,
        purpose:  opts.purpose,
        category: opts.category ?? AgentCategory.GENERAL,
      },
      operator: opts.organization ? { organization: opts.organization } : undefined,
      capabilities: {
        allowedActionTypes: opts.allowedActionTypes ?? ["llm_query"],
        forbiddenActionTypes: ["financial_transaction"],
        canAccessPII: false,
        canWriteFiles: false,
        canSpawnSubAgents: false,
      },
      riskProfile: {
        level: opts.riskLevel ?? RiskLevel.LOW,
        dataClassification: "PUBLIC",
        financialLimit: 0,
      },
    };
  }
}
