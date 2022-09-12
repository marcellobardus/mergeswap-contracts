import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import etherscanVerify from "./utils/etherscan-verify";

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
  
  setTimeout(async () => {
    console.debug('Constructor arguments', {
      RELAYER,
      POW_DEPOSIT_ADDRESS
    });
  
    return etherscanVerify(wrappedPoWETH.address, RELAYER!, POW_DEPOSIT_ADDRESS!, 4);
  }, 120 * 1000); // Invoke after 2 minutes (wait for indexation).
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
