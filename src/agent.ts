import Anthropic from "@anthropic-ai/sdk";
import { AgentPassport } from "./passport";
import {
  ActionRecord,
  AnomalyReport,
  RiskAnalysis,
  CapabilityDeclaration,
  RiskLevel,
} from "./types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const RISK_LABELS: Record<number, string> = {
  0: "LOW",
  1: "MEDIUM",
  2: "HIGH",
  3: "CRITICAL",
};

const CATEGORY_LABELS: Record<number, string> = {
  0: "GENERAL",
  1: "RESEARCH",
  2: "FINANCE",
  3: "MEDICAL",
  4: "LEGAL",
  5: "INFRASTRUCTURE",
  6: "SOCIAL",
};

/**
 * PassportedAgent
 *
 * A Claude-powered AI agent with a Web3 identity (AgentPassport).
 * Every interaction is logged immutably on-chain.
 * On-chain capability declarations enable automatic anomaly detection.
 */
export class PassportedAgent {
  private readonly claude: Anthropic;
  private readonly passport: AgentPassport;
  private readonly model: string;
  private history: Message[] = [];
  private logToChain: boolean;
  private capabilities?: CapabilityDeclaration;

  constructor(
    passport: AgentPassport,
    options: { model?: string; logToChain?: boolean } = {},
  ) {
    this.claude     = new Anthropic();
    this.passport   = passport;
    this.model      = options.model      ?? "claude-opus-4-6";
    this.logToChain = options.logToChain ?? true;
  }

  get address(): string { return this.passport.address; }

  // ── Setup ─────────────────────────────────────────────────────────────────

  /**
   * Register the agent on-chain with a full capability declaration,
   * then print its identity card.
   */
  async initialize(
    name: string,
    version = "1.0.0",
    capabilities?: CapabilityDeclaration,
    metadataURI?: string,
  ): Promise<void> {
    // Build default capabilities if not provided
    const cap = capabilities ?? AgentPassport.buildCapabilityDeclaration({
      name,
      version,
      purpose: `AI agent — ${name}`,
    });
    this.capabilities = cap;

    await this.passport.register(name, version, cap, metadataURI ?? "");

    const id      = await this.passport.getIdentity();
    const balance = await this.passport.getBalance();

    console.log("\n┌──────────────────────────────────────────────────┐");
    console.log("│              AGENTDID PASSPORT                   │");
    console.log("├──────────────────────────────────────────────────┤");
    console.log(`│  Name       : ${id.name.padEnd(36)}│`);
    console.log(`│  Version    : ${id.version.padEnd(36)}│`);
    console.log(`│  DID        : did:agent:${this.passport.address.slice(0, 13)}...${this.passport.address.slice(-8).padEnd(5)}│`);
    console.log(`│  Owner      : ${id.owner.slice(0, 18)}...${id.owner.slice(-8).padEnd(9)}│`);
    console.log(`│  Category   : ${CATEGORY_LABELS[id.category].padEnd(36)}│`);
    console.log(`│  Risk Level : ${RISK_LABELS[id.riskLevel].padEnd(36)}│`);
    console.log(`│  Registered : ${new Date(Number(id.registeredAt) * 1000).toISOString().slice(0, 19).padEnd(36)}│`);
    console.log(`│  Balance    : ${ `${balance} ETH`.padEnd(36)}│`);
    console.log(`│  Active     : ${String(id.active).padEnd(36)}│`);
    console.log("├──────────────────────────────────────────────────┤");
    console.log(`│  Allowed Actions:                                │`);
    for (const at of cap.capabilities.allowedActionTypes) {
      console.log(`│    ✓ ${at.padEnd(44)}│`);
    }
    if ((cap.capabilities.forbiddenActionTypes ?? []).length > 0) {
      console.log(`│  Forbidden Actions:                              │`);
      for (const at of cap.capabilities.forbiddenActionTypes!) {
        console.log(`│    ✗ ${at.padEnd(44)}│`);
      }
    }
    console.log("└──────────────────────────────────────────────────┘\n");
  }

  // ── Core Query ────────────────────────────────────────────────────────────

  /**
   * Send a prompt to Claude. The full input/output is hashed and logged
   * on-chain before this method returns.
   *
   * If the action type is not in the declared allowedActionTypes, a warning
   * is printed and an anomaly is automatically flagged on-chain.
   */
  async query(prompt: string, actionType = "llm_query"): Promise<string> {
    // Pre-flight capability check
    if (this.capabilities) {
      const allowed = this.capabilities.capabilities.allowedActionTypes;
      const forbidden = this.capabilities.capabilities.forbiddenActionTypes ?? [];
      if (forbidden.includes(actionType)) {
        console.warn(`[Agent] ⛔ Blocked: action type "${actionType}" is FORBIDDEN by capability declaration`);
        throw new Error(`Action type "${actionType}" is forbidden for this agent`);
      }
      if (!allowed.includes(actionType)) {
        console.warn(`[Agent] ⚠️  Action type "${actionType}" is NOT in declared allowedActionTypes — flagging anomaly`);
        if (this.logToChain) {
          await this.passport.flagAnomaly(
            this.passport.address,
            `Action type "${actionType}" executed but not declared in capabilities`,
            6,
          ).catch(() => {});
        }
      }
    }

    this.history.push({ role: "user", content: prompt });

    let response = "";
    let success  = true;

    try {
      const apiResponse = await this.claude.messages.create({
        model:      this.model,
        max_tokens: 16000,
        thinking:   { type: "adaptive" },
        system: [
          `You are an AI agent with a verified blockchain identity (AgentDID).`,
          `Your Ethereum address: ${this.passport.address}`,
          `Your DID: did:agent:${this.passport.address}`,
          `All your actions are permanently and immutably recorded on the blockchain.`,
          `Declared purpose: ${this.capabilities?.identity.purpose ?? "general assistant"}`,
          `Be thoughtful, honest, and transparent. You operate within declared capability boundaries.`,
        ].join("\n"),
        messages: this.history,
      });

      response = apiResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      this.history.push({ role: "assistant", content: response });
    } catch (err) {
      response = `[Error] ${err instanceof Error ? err.message : String(err)}`;
      success  = false;
    }

    // Log to blockchain
    if (this.logToChain) {
      try {
        const txHash = await this.passport.logAction(actionType, prompt, response, success);
        console.log(`[Chain] Logged action (${actionType}) → TX: ${txHash}`);
      } catch (logErr) {
        console.warn(`[Chain] Failed to log (offline?): ${logErr}`);
      }
    }

    return response;
  }

  // ── History & Audit ───────────────────────────────────────────────────────

  async getActionHistory(): Promise<ActionRecord[]> {
    return this.passport.getActionHistory();
  }

  async getAnomalyReports(): Promise<AnomalyReport[]> {
    return this.passport.getAnomalyReports(this.passport.address);
  }

  async analyzeRisk(): Promise<RiskAnalysis> {
    return this.passport.analyzeRisk();
  }

  async printAuditTrail(): Promise<void> {
    const history   = await this.getActionHistory();
    const anomalies = await this.getAnomalyReports();
    const id        = await this.passport.getIdentity();

    console.log("\n══════════════════════════════════════════════════════");
    console.log(`  AUDIT TRAIL — ${id.name} v${id.version}`);
    console.log(`  DID: did:agent:${this.passport.address}`);
    console.log(`  Category: ${CATEGORY_LABELS[id.category]}  |  Risk: ${RISK_LABELS[id.riskLevel]}`);
    console.log(`  Total actions: ${history.length}  |  Anomalies: ${anomalies.length}`);
    console.log("══════════════════════════════════════════════════════");

    if (history.length > 0) {
      console.log("\n  ACTION LOG:");
      for (const rec of history) {
        const ts = new Date(Number(rec.timestamp) * 1000).toISOString();
        console.log(`\n  [Action #${rec.actionIndex}]`);
        console.log(`  Time       : ${ts}`);
        console.log(`  Type       : ${rec.actionType}`);
        console.log(`  InputHash  : ${rec.inputHash}`);
        console.log(`  OutputHash : ${rec.outputHash}`);
        console.log(`  Success    : ${rec.success}`);
        console.log(`  TX         : ${rec.txHash}`);
        console.log(`  Block      : ${rec.blockNumber}`);
      }
    }

    if (anomalies.length > 0) {
      console.log("\n  ANOMALY REPORTS:");
      for (const a of anomalies) {
        const ts = new Date(Number(a.timestamp) * 1000).toISOString();
        console.log(`\n  [Anomaly] Severity: ${a.severity}/10`);
        console.log(`  Time     : ${ts}`);
        console.log(`  Reporter : ${a.reporter}`);
        console.log(`  Reason   : ${a.reason}`);
        console.log(`  TX       : ${a.txHash}`);
      }
    }

    console.log("\n══════════════════════════════════════════════════════\n");
  }

  async printRiskAnalysis(): Promise<void> {
    const analysis = await this.analyzeRisk();
    const score    = analysis.overallRiskScore;
    const bar      = "█".repeat(Math.round(score * 20)).padEnd(20, "░");

    console.log("\n══════════════════════════════════════════════════════");
    console.log("  RISK ANALYSIS");
    console.log(`  Agent : ${analysis.agentAddress}`);
    console.log(`  Score : [${bar}] ${(score * 100).toFixed(0)}%`);
    console.log(`  Total actions : ${analysis.totalActions}`);
    console.log(`  Anomaly flags : ${analysis.anomalyCount}`);

    if (analysis.unauthorizedActionTypes.length > 0) {
      console.log(`\n  Unauthorized action types detected:`);
      for (const t of analysis.unauthorizedActionTypes) console.log(`    ⚠️  ${t}`);
    }

    console.log(`\n  Observed action distribution:`);
    for (const [k, v] of Object.entries(analysis.observedActionDistribution)) {
      console.log(`    ${k.padEnd(28)} ${(v * 100).toFixed(1)}%`);
    }

    if (analysis.alerts.length > 0) {
      console.log(`\n  Alerts:`);
      for (const a of analysis.alerts) console.log(`    ${a}`);
    } else {
      console.log(`\n  ✓ No alerts`);
    }

    console.log("══════════════════════════════════════════════════════\n");
  }

  /**
   * Verify a specific action's integrity by re-hashing known data.
   */
  verifyAction(
    record: ActionRecord,
    originalInput: string,
    originalOutput: string,
  ): { inputValid: boolean; outputValid: boolean } {
    return {
      inputValid:  AgentPassport.verifyHash(originalInput,  record.inputHash),
      outputValid: AgentPassport.verifyHash(originalOutput, record.outputHash),
    };
  }

  clearConversation(): void { this.history = []; }
}
