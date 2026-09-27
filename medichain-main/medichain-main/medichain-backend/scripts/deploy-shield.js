/**
 * MediChain Shield - AccessRegistry Deployment Script
 * 
 * Deploys the AccessRegistry contract and automatically generates
 * configuration files for both backend and frontend.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-shield.js --network localhost
 *   npx hardhat run scripts/deploy-shield.js --network amoy
 */

const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  console.log("\nMediChain Shield Deployment\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", network.name, "- Chain ID:", network.chainId.toString());
  console.log();

  // Deploy AccessRegistry
  console.log("Deploying AccessRegistry...");
  const AccessRegistry = await ethers.getContractFactory("AccessRegistry");
  const accessRegistry = await AccessRegistry.deploy();
  await accessRegistry.waitForDeployment();

  const contractAddress = await accessRegistry.getAddress();
  console.log("AccessRegistry deployed to:", contractAddress);

  // Wait for block confirmations on testnets
  if (network.chainId !== 31337n) {
    console.log("Waiting for block confirmations...");
    await accessRegistry.deploymentTransaction().wait(3);
    console.log("Confirmed");
  }

  // Get contract ABI
  const artifact = await ethers.getContractAt("AccessRegistry", contractAddress);
  const contractInterface = artifact.interface;
  const abi = contractInterface.formatJson();

  // Contract configuration object
  const config = {
    AccessRegistry: {
      address: contractAddress,
      abi: JSON.parse(abi),
      deployedAt: new Date().toISOString(),
      network: network.name,
      chainId: network.chainId.toString(),
      deployer: deployer.address,
    },
  };

  // Create config directories if they don't exist
  const backendConfigDir = path.join(__dirname, "..", "server", "config");
  const frontendConfigDir = path.join(__dirname, "..", "..", "medichain-main", "medichain-main", "lib", "config");

  if (!fs.existsSync(backendConfigDir)) {
    fs.mkdirSync(backendConfigDir, { recursive: true });
  }

  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }

  // Write backend config
  const backendConfigPath = path.join(backendConfigDir, "contracts.json");
  fs.writeFileSync(backendConfigPath, JSON.stringify(config, null, 2));
  console.log("\nBackend config written to:", backendConfigPath);

  // Write frontend config
  const frontendConfigPath = path.join(frontendConfigDir, "contracts.json");
  fs.writeFileSync(frontendConfigPath, JSON.stringify(config, null, 2));
  console.log("Frontend config written to:", frontendConfigPath);

  // Also create a TypeScript version for frontend
  const tsConfig = `/**
 * Auto-generated contract configuration
 * Generated at: ${new Date().toISOString()}
 * Network: ${network.name} (Chain ID: ${network.chainId})
 */

export const contracts = ${JSON.stringify(config, null, 2)} as const;

export type ContractConfig = typeof contracts;
`;

  const frontendTsConfigPath = path.join(frontendConfigDir, "contracts.ts");
  fs.writeFileSync(frontendTsConfigPath, tsConfig);
  console.log("Frontend TypeScript config written to:", frontendTsConfigPath);

  // Print summary
  console.log("\nDeployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract:      AccessRegistry");
  console.log("Address:       ", contractAddress);
  console.log("Network:       ", network.name);
  console.log("Chain ID:      ", network.chainId.toString());
  console.log("Deployer:      ", deployer.address);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Print contract constants
  const maxGrantDuration = await accessRegistry.MAX_GRANT_DURATION();
  console.log("\nContract Constants:");
  console.log("Max Grant Duration:", Number(maxGrantDuration) / 86400, "days");

  // Print next steps
  console.log("\nNext Steps:");
  console.log("1. Backend: Contract config available at server/config/contracts.json");
  console.log("2. Frontend: Contract config available at lib/config/contracts.ts");
  console.log("3. Update .env files with RPC URL if deploying to testnet");
  console.log("4. Run tests: npx hardhat test");
  console.log("5. Verify on explorer (if on testnet):");
  console.log(`   npx hardhat verify --network ${network.name} ${contractAddress}`);
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDeployment failed:");
    console.error(error);
    process.exit(1);
  });
