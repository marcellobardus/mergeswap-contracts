import { ethers } from "hardhat";
import * as dotenv from "dotenv";

async function main() {
  dotenv.config();
  const { RELAYER, POW_DEPOSIT_ADDRESS } = process.env;

  const WrappedPoWETH = await ethers.getContractFactory("WrappedPoWETH");
  const wrappedPoWETH = await WrappedPoWETH.deploy(
    RELAYER!,
    POW_DEPOSIT_ADDRESS!,
    4
  );

  await wrappedPoWETH.deployed();

  console.log(`Deployed WrappedPoWETH to address: ${wrappedPoWETH.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
