import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { JsonRpcProvider } from "@ethersproject/providers";
import { predictContractAddress } from "./utils/predict-address";

async function main() {
  dotenv.config();
  const { RELAYER, POS_RPC, DEPLOYER_ACCOUNT } = process.env;

  const deployerNoncePoS = await new JsonRpcProvider(
    POS_RPC!
  ).getTransactionCount(DEPLOYER_ACCOUNT!);
  const withdrawalsContract = predictContractAddress(
    DEPLOYER_ACCOUNT!,
    deployerNoncePoS
  );

  const DepositPoW = await ethers.getContractFactory("DepositPoW");
  const depositPoW = await DepositPoW.deploy(RELAYER!, withdrawalsContract, 6);

  await depositPoW.deployed();

  console.log(`Deployed DepositPoW to address: ${depositPoW.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
