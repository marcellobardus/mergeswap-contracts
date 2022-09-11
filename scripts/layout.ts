import hre from "hardhat";

async function main() {
  const layout = await hre.storageLayout.export();
  console.log(layout);
}

main();
