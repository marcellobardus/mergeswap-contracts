import hre from "hardhat";

export default async function etherscanVerify(contractAddress: string, ...constructorArguments: any[]) {
  return hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments,
    });
}
