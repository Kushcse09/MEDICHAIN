require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // Ethereum Sepolia — chosen for reliability over Polygon Amoy's unstable public RPC.
    // Uses Alchemy free-tier endpoint (set ALCHEMY_API_KEY in medichain-backend/.env).
    sepolia: {
      url: process.env.ALCHEMY_API_KEY
        ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : process.env.INFURA_API_KEY
        ? `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`
        : "https://rpc.sepolia.org", // public fallback for local testing only
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 11155111,
    },
    // Keep amoy as secondary option if user already has funds there
    amoy: {
      url: process.env.ALCHEMY_API_KEY
        ? `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 80002,
    },
    hardhat: {
      // local in-memory chain for fast testing
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
};
