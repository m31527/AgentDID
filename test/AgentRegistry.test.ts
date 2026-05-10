import { expect }    from "chai";
import { ethers }    from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("AgentRegistry", function () {
  // ── Shared fixture ─────────────────────────────────────────────────────
  async function deployFixture() {
    const [owner, agent, stranger] = await ethers.getSigners();
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    const registry = await AgentRegistry.deploy();
    await registry.waitForDeployment();
    return { registry, owner, agent, stranger };
  }

  // Helper: register an agent with default capability params
  async function register(registry: any, owner: any, agent: any, opts?: {
    name?: string; version?: string; metadataURI?: string;
    capabilityHash?: string; riskLevel?: number; category?: number;
  }) {
    const capHash = opts?.capabilityHash
      ?? ethers.keccak256(ethers.toUtf8Bytes("{}"));
    return registry.connect(owner).registerAgent(
      agent.address,
      opts?.name        ?? "TestBot",
      opts?.version     ?? "1.0.0",
      opts?.metadataURI ?? "ipfs://test",
      capHash,
      opts?.riskLevel   ?? 0,   // RiskLevel.LOW
      opts?.category    ?? 0,   // AgentCategory.GENERAL
    );
  }

  // ── Registration ──────────────────────────────────────────────────────
  describe("registerAgent", function () {
    it("registers a new agent and emits AgentRegistered", async function () {
      const { registry, owner, agent } = await loadFixture(deployFixture);
      const capHash = ethers.keccak256(ethers.toUtf8Bytes("{}"));

      await expect(register(registry, owner, agent, { capabilityHash: capHash }))
        .to.emit(registry, "AgentRegistered")
        .withArgs(
          agent.address, "TestBot", "1.0.0", owner.address,
          anyValue, "ipfs://test", capHash, 0, 0,
        );
    });

    it("sets identity fields correctly including capability fields", async function () {
      const { registry, owner, agent } = await loadFixture(deployFixture);
      const capHash = ethers.keccak256(ethers.toUtf8Bytes('{"schema":"agentdid-capability/v1"}'));

      await registry.connect(owner).registerAgent(
        agent.address, "Bot", "2.0.0", "ipfs://meta",
        capHash, 2, 1,   // riskLevel=HIGH, category=RESEARCH
      );

      const id = await registry.getAgent(agent.address);
      expect(id.name).to.equal("Bot");
      expect(id.version).to.equal("2.0.0");
      expect(id.owner).to.equal(owner.address);
      expect(id.active).to.be.true;
      expect(id.actionCount).to.equal(0n);
      expect(id.successCount).to.equal(0n);
      expect(id.capabilityHash).to.equal(capHash);
      expect(id.riskLevel).to.equal(2);     // HIGH
      expect(id.category).to.equal(1);      // RESEARCH
      expect(id.anomalyCount).to.equal(0n);
    });

    it("marks address as registered", async function () {
      const { registry, owner, agent } = await loadFixture(deployFixture);
      expect(await registry.isRegistered(agent.address)).to.be.false;
      await register(registry, owner, agent);
      expect(await registry.isRegistered(agent.address)).to.be.true;
    });

    it("reverts on duplicate registration", async function () {
      const { registry, owner, agent } = await loadFixture(deployFixture);
      await register(registry, owner, agent);
      await expect(register(registry, owner, agent, { name: "Bot2" }))
        .to.be.revertedWith("AgentRegistry: already registered");
    });

    it("reverts on zero address", async function () {
      const { registry, owner } = await loadFixture(deployFixture);
      const capHash = ethers.keccak256(ethers.toUtf8Bytes("{}"));
      await expect(
        registry.connect(owner).registerAgent(
          ethers.ZeroAddress, "Bot", "1.0.0", "", capHash, 0, 0,
        ),
      ).to.be.revertedWith("AgentRegistry: zero address");
    });

    it("reverts on empty name", async function () {
      const { registry, owner, agent } = await loadFixture(deployFixture);
      const capHash = ethers.keccak256(ethers.toUtf8Bytes("{}"));
      await expect(
        registry.connect(owner).registerAgent(
          agent.address, "", "1.0.0", "", capHash, 0, 0,
        ),
      ).to.be.revertedWith("AgentRegistry: empty name");
    });
  });

  // ── Action Logging ────────────────────────────────────────────────────
  describe("logAction", function () {
    async function registeredFixture() {
      const base = await loadFixture(deployFixture);
      await register(base.registry, base.owner, base.agent);
      return base;
    }

    it("logs action and emits ActionLogged", async function () {
      const { registry, agent } = await loadFixture(registeredFixture);
      const inputHash  = ethers.keccak256(ethers.toUtf8Bytes("hello"));
      const outputHash = ethers.keccak256(ethers.toUtf8Bytes("world"));

      await expect(
        registry.connect(agent).logAction("llm_query", inputHash, outputHash, true),
      ).to.emit(registry, "ActionLogged");
    });

    it("increments actionCount and successCount", async function () {
      const { registry, agent } = await loadFixture(registeredFixture);
      const h = ethers.keccak256(ethers.toUtf8Bytes("x"));
      await registry.connect(agent).logAction("test", h, h, true);   // success
      await registry.connect(agent).logAction("test", h, h, false);  // fail
      await registry.connect(agent).logAction("test", h, h, true);   // success
      const id = await registry.getAgent(agent.address);
      expect(id.actionCount).to.equal(3n);
      expect(id.successCount).to.equal(2n);
    });

    it("reverts for unregistered address", async function () {
      const { registry, stranger } = await loadFixture(registeredFixture);
      const h = ethers.keccak256(ethers.toUtf8Bytes("x"));
      await expect(
        registry.connect(stranger).logAction("test", h, h, true),
      ).to.be.revertedWith("AgentRegistry: not registered");
    });
  });

  // ── Anomaly Flagging ──────────────────────────────────────────────────
  describe("flagAnomaly", function () {
    async function registeredFixture() {
      const base = await loadFixture(deployFixture);
      await register(base.registry, base.owner, base.agent);
      return base;
    }

    it("anyone can flag an anomaly and emits AnomalyFlagged", async function () {
      const { registry, agent, stranger } = await loadFixture(registeredFixture);

      await expect(
        registry.connect(stranger).flagAnomaly(
          agent.address, "Unexpected financial transaction", 8,
        ),
      )
        .to.emit(registry, "AnomalyFlagged")
        .withArgs(agent.address, stranger.address, "Unexpected financial transaction", 8, anyValue);
    });

    it("increments anomalyCount on the agent", async function () {
      const { registry, agent, stranger } = await loadFixture(registeredFixture);

      await registry.connect(stranger).flagAnomaly(agent.address, "Reason A", 3);
      await registry.connect(stranger).flagAnomaly(agent.address, "Reason B", 5);

      const id = await registry.getAgent(agent.address);
      expect(id.anomalyCount).to.equal(2n);
    });

    it("reverts for unregistered agent", async function () {
      const { registry, stranger } = await loadFixture(deployFixture);
      await expect(
        registry.connect(stranger).flagAnomaly(stranger.address, "Test", 5),
      ).to.be.revertedWith("AgentRegistry: not registered");
    });

    it("reverts for severity out of range", async function () {
      const { registry, agent, stranger } = await loadFixture(registeredFixture);
      await expect(
        registry.connect(stranger).flagAnomaly(agent.address, "Test", 0),
      ).to.be.revertedWith("AgentRegistry: severity must be 1-10");
      await expect(
        registry.connect(stranger).flagAnomaly(agent.address, "Test", 11),
      ).to.be.revertedWith("AgentRegistry: severity must be 1-10");
    });

    it("reverts for empty reason", async function () {
      const { registry, agent, stranger } = await loadFixture(registeredFixture);
      await expect(
        registry.connect(stranger).flagAnomaly(agent.address, "", 5),
      ).to.be.revertedWith("AgentRegistry: empty reason");
    });
  });

  // ── Deactivation ──────────────────────────────────────────────────────
  describe("deactivateAgent", function () {
    async function registeredFixture() {
      const base = await loadFixture(deployFixture);
      await register(base.registry, base.owner, base.agent);
      return base;
    }

    it("owner can deactivate", async function () {
      const { registry, owner, agent } = await loadFixture(registeredFixture);
      await registry.connect(owner).deactivateAgent(agent.address);
      const id = await registry.getAgent(agent.address);
      expect(id.active).to.be.false;
    });

    it("agent can deactivate itself", async function () {
      const { registry, agent } = await loadFixture(registeredFixture);
      await registry.connect(agent).deactivateAgent(agent.address);
      const id = await registry.getAgent(agent.address);
      expect(id.active).to.be.false;
    });

    it("stranger cannot deactivate", async function () {
      const { registry, stranger, agent } = await loadFixture(registeredFixture);
      await expect(
        registry.connect(stranger).deactivateAgent(agent.address),
      ).to.be.revertedWith("AgentRegistry: unauthorized");
    });

    it("deactivated agent cannot log actions", async function () {
      const { registry, owner, agent } = await loadFixture(registeredFixture);
      await registry.connect(owner).deactivateAgent(agent.address);
      const h = ethers.keccak256(ethers.toUtf8Bytes("x"));
      await expect(
        registry.connect(agent).logAction("test", h, h, true),
      ).to.be.revertedWith("AgentRegistry: agent not active");
    });
  });

  // ── Reputation ────────────────────────────────────────────────────────
  describe("getReputation", function () {
    async function registeredFixture() {
      const base = await loadFixture(deployFixture);
      await register(base.registry, base.owner, base.agent);
      return base;
    }

    it("new agent starts at 80", async function () {
      const { registry, agent } = await loadFixture(registeredFixture);
      expect(await registry.getReputation(agent.address)).to.equal(80n);
    });

    it("all successful actions push score to 100", async function () {
      const { registry, agent } = await loadFixture(registeredFixture);
      const h = ethers.keccak256(ethers.toUtf8Bytes("x"));
      // 10 successful actions → actionBonus = (10/10)*20 = 20
      for (let i = 0; i < 10; i++) {
        await registry.connect(agent).logAction("test", h, h, true);
      }
      expect(await registry.getReputation(agent.address)).to.equal(100n);
    });

    it("each anomaly deducts 10 points", async function () {
      const { registry, agent, stranger } = await loadFixture(registeredFixture);
      await registry.connect(stranger).flagAnomaly(agent.address, "Bad", 5);
      await registry.connect(stranger).flagAnomaly(agent.address, "Worse", 8);
      // 80 - 20 = 60
      expect(await registry.getReputation(agent.address)).to.equal(60n);
    });

    it("score floors at 0 with many anomalies", async function () {
      const { registry, agent, stranger } = await loadFixture(registeredFixture);
      for (let i = 0; i < 10; i++) {
        await registry.connect(stranger).flagAnomaly(agent.address, "Report", 5);
      }
      expect(await registry.getReputation(agent.address)).to.equal(0n);
    });

    it("returns 0 for unregistered address", async function () {
      const { registry, stranger } = await loadFixture(deployFixture);
      expect(await registry.getReputation(stranger.address)).to.equal(0n);
    });

    it("returns 0 for deactivated agent", async function () {
      const { registry, owner, agent } = await loadFixture(registeredFixture);
      await registry.connect(owner).deactivateAgent(agent.address);
      expect(await registry.getReputation(agent.address)).to.equal(0n);
    });
  });
});
