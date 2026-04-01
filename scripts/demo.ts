/**
 * Full end-to-end demo:
 *  1. Connects to a local Hardhat node
 *  2. Creates a fresh agent wallet and funds it from a test account
 *  3. Registers the agent's identity on-chain
 *  4. Runs several Claude queries — each one is logged to the blockchain
 *  5. Prints the full on-chain audit trail
 *  6. Demonstrates hash verification
 *
 * Run:
 *   npx hardhat node           (in one terminal)
 *   npm run deploy             (deploys the contract)
 *   npm run demo               (runs this script)
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { AgentPassport } from "../src/passport";
import { PassportedAgent } from "../src/agent";

dotenv.config();

async function main(): Promise<void> {
  // ── Load deployment ──────────────────────────────────────────────────────
  if (!fs.existsSync("deployment.json")) {
    throw new Error(
      "No deployment.json found. Run: npm run deploy first.",
    );
  }
  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8")) as {
    address: string;
    network: string;
  };
  console.log(`Registry: ${deployment.address} (${deployment.network})\n`);

  // ── Fund agent wallet ────────────────────────────────────────────────────
  // On a Hardhat node the first test account has 10,000 ETH — use it to fund
  // the agent so it can pay for gas when logging actions.
  const [operator] = await ethers.getSigners();
  const provider   = ethers.provider;

  // Use env var if available (resuming a previous session), else generate fresh
  const agentWallet = process.env.AGENT_PRIVATE_KEY
    ? new ethers.Wallet(process.env.AGENT_PRIVATE_KEY).connect(provider)
    : ethers.Wallet.createRandom().connect(provider);

  const agentBalance = await provider.getBalance(agentWallet.address);
  if (agentBalance === 0n) {
    console.log(`Funding agent ${agentWallet.address} from operator...`);
    const fundTx = await operator.sendTransaction({
      to:    agentWallet.address,
      value: ethers.parseEther("1.0"),
    });
    await fundTx.wait();
    console.log("Funded with 1.0 ETH\n");
  }

  // ── Create passport & agent ──────────────────────────────────────────────
  const passport = new AgentPassport(
    agentWallet as ethers.Wallet,
    deployment.address,
  );

  const agent = new PassportedAgent(passport, {
    model:      "claude-opus-4-6",
    logToChain: true,
  });

  await agent.initialize(
    "ResearchBot",
    "1.0.0",
    "ipfs://QmAgentPassportMetadata",
  );

  // ── Queries (each logs an action on-chain) ───────────────────────────────
  console.log("─".repeat(52));

  const session: Array<{ prompt: string; response: string }> = [];

  const prompts = [
    "What is the significance of cryptographic identity for autonomous AI agents?",
    "How does storing action hashes on a blockchain create accountability?",
    "In 2 sentences: what are the key trade-offs between on-chain and off-chain action storage?",
  ];

  for (const prompt of prompts) {
    console.log(`\nUser: ${prompt}`);
    const response = await agent.query(prompt);
    console.log(`\nAgent: ${response.slice(0, 280)}${response.length > 280 ? "…" : ""}\n`);
    console.log("─".repeat(52));
    session.push({ prompt, response });
    // Brief pause between requests
    await new Promise((r) => setTimeout(r, 800));
  }

  // ── Audit trail ──────────────────────────────────────────────────────────
  await agent.printAuditTrail();

  // ── Verification demo ─────────────────────────────────────────────────────
  const history = await agent.getActionHistory();
  if (history.length > 0 && session.length > 0) {
    const firstRecord = history[0]!;
    const firstSession = session[0]!;
    const { inputValid, outputValid } = agent.verifyAction(
      firstRecord,
      firstSession.prompt,
      firstSession.response,
    );
    console.log("Hash Verification (action #0):");
    console.log(`  Input  hash valid: ${inputValid  ? "✓" : "✗"}`);
    console.log(`  Output hash valid: ${outputValid ? "✓" : "✗"}`);
    console.log(`  (Tampering with either string would make these fail)\n`);
  }

  // ── Save private key hint ─────────────────────────────────────────────────
  if (!process.env.AGENT_PRIVATE_KEY) {
    console.log("💾 Save this agent's private key to .env to resume later:");
    console.log(`   AGENT_PRIVATE_KEY=${agentWallet.privateKey}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
