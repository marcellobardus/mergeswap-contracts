import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Wallet } from "ethers";
import {
  defaultAbiCoder,
  hexZeroPad,
  joinSignature,
  keccak256,
  parseEther,
} from "ethers/lib/utils";
import { ethers } from "hardhat";
import { posProof, posStateRoot } from "./mocks/proof";
import { encodeProof } from "./utils/encode-proof";

describe("DepositPoW", function () {
  const deployDepositPoWFixture = async () => {
    const [user] = await ethers.getSigners();
    const relayer = new Wallet(Wallet.createRandom().privateKey, user.provider);

    const DepositPoW = await ethers.getContractFactory("DepositPoW");
    const depositPoW = await DepositPoW.deploy(
      relayer.address,
      "0x99704d67e180906ca3bab391076bd9656e6312e9",
      6
    );
    return { user, relayer, depositPoW };
  };

  describe("Deposit", () => {
    it("Should successfully handle a valid deposit", async function () {
      const { user, relayer, depositPoW } = await loadFixture(
        deployDepositPoWFixture
      );

      await depositPoW
        .connect(user)
        .deposit(parseEther("1"), user.address, { value: parseEther("1") });

      const depositsCount = await depositPoW.depositsCount();
      expect(depositsCount).equal(1);

      const depositInfo = keccak256(
        defaultAbiCoder.encode(
          ["uint256", "address"],
          [parseEther("1"), user.address]
        )
      );
      const setDepositInfo = await depositPoW.deposits(0);

      expect(setDepositInfo).equal(depositInfo);

      const paddedSlot = hexZeroPad("0x3", 32);
      const paddedKey = hexZeroPad("0x0", 32);
      const itemSlot = keccak256(paddedKey + paddedSlot.slice(2));

      const storageAt = await user.provider?.getStorageAt(
        depositPoW.address,
        itemSlot
      );

      expect(setDepositInfo).equal(storageAt);
    });

    it("Should revert if msg.value is below amount", async () => {
      const { user, relayer, depositPoW } = await loadFixture(
        deployDepositPoWFixture
      );

      expect(
        depositPoW
          .connect(user)
          .deposit(parseEther("1"), user.address, { value: parseEther("0") })
      ).to.throw;
    });
  });

  describe("Relay state root", async () => {
    it("Should relay the state root", async () => {
      const { user, relayer, depositPoW } = await loadFixture(
        deployDepositPoWFixture
      );

      const sigRaw = await relayer._signingKey().signDigest(posStateRoot);
      const sig = joinSignature(sigRaw);

      const blockNumber = 10;
      await depositPoW
        .connect(user)
        .relayStateRoot(blockNumber, posStateRoot, sig);

      const setStateRoot = await depositPoW.stateRoots(blockNumber);
      expect(setStateRoot).equal(posStateRoot);
    });
  });

  describe("Update withdrawal contract storage root", () => {
    it("Should update withdrawal contract storage root", async () => {
      const { user, relayer, depositPoW } = await loadFixture(
        deployDepositPoWFixture
      );

      const sigRaw = await relayer._signingKey().signDigest(posStateRoot);
      const sig = joinSignature(sigRaw);

      const blockNumber = 10;
      await depositPoW
        .connect(user)
        .relayStateRoot(blockNumber, posStateRoot, sig);

      const accountProofEncoded = encodeProof(posProof.accountProof);
      await depositPoW.updateWithdrawalContractStorageRoot(
        blockNumber,
        accountProofEncoded
      );

      const setStorageRoot = await depositPoW.withdrawalContractStorageRoots(
        blockNumber
      );
      expect(setStorageRoot).equal(posProof.storageHash);
    });
  });

  describe("Withdrawal", () => {
    it("Should successfully withdraw locked funds", async () => {
      const { user, relayer, depositPoW } = await loadFixture(
        deployDepositPoWFixture
      );

      const sigRaw = await relayer._signingKey().signDigest(posStateRoot);
      const sig = joinSignature(sigRaw);

      const blockNumber = 10;
      await depositPoW
        .connect(user)
        .relayStateRoot(blockNumber, posStateRoot, sig);

      const accountProofEncoded = encodeProof(posProof.accountProof);
      await depositPoW.updateWithdrawalContractStorageRoot(
        blockNumber,
        accountProofEncoded
      );

      const storageProofEncoded = encodeProof(posProof.storageProof[0].proof);
      await depositPoW.withdraw(
        "0",
        "0xF6db677FB4c73A98CB991BCa6C01bD4EC98e9398",
        "0",
        blockNumber,
        storageProofEncoded
      );
    });
  });
});
