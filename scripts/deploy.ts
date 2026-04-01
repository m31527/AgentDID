import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * Deploy AgentRegistry and save the contract address to deployment.json.
 * Run with: npx hardhat run scripts/deploy.ts --network <network>
 */
async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying AgentRegistry...");
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const block   = await ethers.provider.getBlockNumber();

  console.log(`\nAgentRegistry deployed:`);
  console.log(`  Address : ${address}`);
  console.log(`  Block   : ${block}`);
  console.log(`  Network : ${(await ethers.provider.getNetwork()).name}`);

  const deployment = {
    address,
    network:    (await ethers.provider.getNetwork()).name,
    chainId:    Number((await ethers.provider.getNetwork()).chainId),
    block,
    deployedAt: new Date().toISOString(),
    deployer:   deployer.address,
  };

  fs.writeFileSync("deployment.json", JSON.stringify(deployment, null, 2));
  console.log("\nSaved to deployment.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
