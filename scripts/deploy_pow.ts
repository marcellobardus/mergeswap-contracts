import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { JsonRpcProvider } from "@ethersproject/providers";
import { predictContractAddress } from "./utils/predict-address";
import etherscanVerify from "./utils/etherscan-verify";

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

  setTimeout(async () => {
    console.debug('Constructor arguments', {
      RELAYER,
      withdrawalsContract
    });
  
    return etherscanVerify(depositPoW.address, RELAYER!, withdrawalsContract!, 6);
  }, 120 * 1000); // Invoke after 2 minutes (wait for indexation).
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
