import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "hardhat-storage-layout";

import * as dotenv from "dotenv";

dotenv.config();

const { POS_RPC, POW_RPC, DEPLOYER_PRIVATE_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  networks: {
    hardhat: {},
    pow: {
      url: POW_RPC!,
      accounts: [DEPLOYER_PRIVATE_KEY!],
    },
    pos: {
      url: POS_RPC,
      accounts: [DEPLOYER_PRIVATE_KEY!],
    },
  },
  gasReporter: {
    enabled: true,
  },
};

export default config;
