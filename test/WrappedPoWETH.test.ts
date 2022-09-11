import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { proof } from "./mocks/proof";
import { encodeProof } from "./utils/encode-proof";

describe("ReceiveWPoW", function () {
  const deployReceiveWPoWFixture = async () => {
    const [user, relayer] = await ethers.getSigners();
    const ReceiveWPoW = await ethers.getContractFactory("WrappedPoWETH");
    const receiveWPoW = await ReceiveWPoW.deploy(
      relayer.address,
      relayer.address,
      0
    );
    return { user, relayer, receiveWPoW };
  };

  it("Should initialize the contract", async () => {
    const { user, relayer, receiveWPoW } = await loadFixture(
      deployReceiveWPoWFixture
    );

    console.log(receiveWPoW.address);
  });

  it("Should log the proof", () => {
    console.log(encodeProof(proof.accountProof));
  });
});
