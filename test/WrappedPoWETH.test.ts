import { ethers } from "hardhat";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Wallet } from "ethers";
import { joinSignature, parseEther } from "ethers/lib/utils";

import { powProof, powStateRoot } from "./mocks/proof";
import { encodeProof } from "./utils/encode-proof";

describe("ReceiveWPoW", function () {
  const deployReceiveWPoWFixture = async () => {
    const [user] = await ethers.getSigners();
    const relayer = new Wallet(Wallet.createRandom().privateKey, user.provider);

    const WrappedPoWETH = await ethers.getContractFactory("WrappedPoWETH");
    const wrappedPowETH = await WrappedPoWETH.deploy(
      relayer.address,
      "0xE0f8a92b85aD593d31565Dd0666A45b875Bd9b8A",
      3
    );
    return { user, relayer, wrappedPowETH };
  };

  it("Should initialize the contract", async () => {
    const { user, relayer, wrappedPowETH } = await loadFixture(
      deployReceiveWPoWFixture
    );
  });

  describe("Relay", () => {
    it("Should relay state root", async () => {
      const { user, relayer, wrappedPowETH } = await loadFixture(
        deployReceiveWPoWFixture
      );
      const sigRaw = await relayer._signingKey().signDigest(powStateRoot);
      const sig = joinSignature(sigRaw);

      const blockNumber = 10;
      await wrappedPowETH
        .connect(user)
        .relayStateRoot(blockNumber, powStateRoot, sig);

      const setStateRoot = await wrappedPowETH.stateRoots(blockNumber);
      expect(setStateRoot).equal(powStateRoot);
    });
  });

  describe("Update deposit contract storage root", () => {
    it("Should update deposit contract storage root", async () => {
      const { user, relayer, wrappedPowETH } = await loadFixture(
        deployReceiveWPoWFixture
      );
      const sigRaw = await relayer._signingKey().signDigest(powStateRoot);
      const sig = joinSignature(sigRaw);

      const blockNumber = 10;
      await wrappedPowETH
        .connect(user)
        .relayStateRoot(blockNumber, powStateRoot, sig);

      const accountProofEncoded = encodeProof(powProof.accountProof);
      await wrappedPowETH.updateDepositContractStorageRoot(
        blockNumber,
        accountProofEncoded
      );

      const setStorageRoot = await wrappedPowETH.depositContractStorageRoots(
        blockNumber
      );
      expect(setStorageRoot).equal(powProof.storageHash);
    });
  });

  describe("Mint", () => {
    it("Should mint ETHPOW", async () => {
      const { user, relayer, wrappedPowETH } = await loadFixture(
        deployReceiveWPoWFixture
      );
      const sigRaw = await relayer._signingKey().signDigest(powStateRoot);
      const sig = joinSignature(sigRaw);

      const blockNumber = 10;
      await wrappedPowETH
        .connect(user)
        .relayStateRoot(blockNumber, powStateRoot, sig);

      const accountProofEncoded = encodeProof(powProof.accountProof);
      await wrappedPowETH.updateDepositContractStorageRoot(
        blockNumber,
        accountProofEncoded
      );

      const storageProofEncoded = encodeProof(powProof.storageProof[0].proof);
      await wrappedPowETH.mint(
        "0",
        "0xF6db677FB4c73A98CB991BCa6C01bD4EC98e9398",
        parseEther("1"),
        blockNumber,
        storageProofEncoded
      );

      const tokensMinted = await wrappedPowETH.balanceOf(
        "0xF6db677FB4c73A98CB991BCa6C01bD4EC98e9398"
      );
      expect(tokensMinted).equal(parseEther("1"));
    });

    it("Should revert in case a deposit is attempted to be minted twice", async () => {
      const { user, relayer, wrappedPowETH } = await loadFixture(
        deployReceiveWPoWFixture
      );
      const sigRaw = await relayer._signingKey().signDigest(powStateRoot);
      const sig = joinSignature(sigRaw);

      const blockNumber = 10;
      await wrappedPowETH
        .connect(user)
        .relayStateRoot(blockNumber, powStateRoot, sig);

      const accountProofEncoded = encodeProof(powProof.accountProof);
      await wrappedPowETH.updateDepositContractStorageRoot(
        blockNumber,
        accountProofEncoded
      );

      const storageProofEncoded = encodeProof(powProof.storageProof[0].proof);
      await wrappedPowETH.mint(
        "0",
        "0xF6db677FB4c73A98CB991BCa6C01bD4EC98e9398",
        parseEther("1"),
        blockNumber,
        storageProofEncoded
      );

      expect(
        wrappedPowETH.mint(
          "0",
          "0xF6db677FB4c73A98CB991BCa6C01bD4EC98e9398",
          parseEther("1"),
          blockNumber,
          storageProofEncoded
        )
      ).throws;

      const tokensMinted = await wrappedPowETH.balanceOf(
        "0xF6db677FB4c73A98CB991BCa6C01bD4EC98e9398"
      );
      expect(tokensMinted).equal(parseEther("1"));
    });
  });
});
