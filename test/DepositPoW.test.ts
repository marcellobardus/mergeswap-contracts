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
import { proof, stateRoot } from "./mocks/proof";
import { encodeProof } from "./utils/encode-proof";

describe("DepositPoW", function () {
  const deployDepositPoWFixture = async () => {
    const [user] = await ethers.getSigners();
    const relayer = new Wallet(Wallet.createRandom().privateKey, user.provider);

    const DepositPoW = await ethers.getContractFactory("DepositPoW");
    const depositPoW = await DepositPoW.deploy(
      relayer.address,
      "0x6b175474e89094c44da98b954eedeac495271d0f",
      2
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

      const sigRaw = await relayer._signingKey().signDigest(stateRoot);
      const sig = joinSignature(sigRaw);

      const blockNumber = 10;
      await depositPoW
        .connect(user)
        .relayStateRoot(blockNumber, stateRoot, sig);

      const setStateRoot = await depositPoW.stateRoots(blockNumber);
      expect(setStateRoot).equal(stateRoot);
    });
  });

  describe("Update withdrawal contract storage root", () => {
    it("Should update withdrawal contract storage root", async () => {
      const { user, relayer, depositPoW } = await loadFixture(
        deployDepositPoWFixture
      );

      const sigRaw = await relayer._signingKey().signDigest(stateRoot);
      const sig = joinSignature(sigRaw);

      const blockNumber = 10;
      await depositPoW
        .connect(user)
        .relayStateRoot(blockNumber, stateRoot, sig);

      const accountProofEncoded = encodeProof(proof.accountProof);
      await depositPoW.updateWithdrawalContractStorageRoot(
        blockNumber,
        accountProofEncoded
      );

      const setStorageRoot = await depositPoW.withdrawalContractStorageRoots(
        blockNumber
      );
      expect(setStorageRoot).equal(proof.storageHash);
    });
  });

  describe("Withdrawal", () => {
    it("Should successfully withdraw locked funds", async () => {
      const { user, relayer, depositPoW } = await loadFixture(
        deployDepositPoWFixture
      );

      const sigRaw = await relayer._signingKey().signDigest(stateRoot);
      const sig = joinSignature(sigRaw);

      const blockNumber = 10;
      await depositPoW
        .connect(user)
        .relayStateRoot(blockNumber, stateRoot, sig);

      const accountProofEncoded = encodeProof(proof.accountProof);
      await depositPoW.updateWithdrawalContractStorageRoot(
        blockNumber,
        accountProofEncoded
      );

      const storageProofEncoded = encodeProof(proof.storageProof[0].proof);
      await depositPoW.withdraw(
        "0xf37Fd9185Bb5657D7E57DDEA268Fe56C2458F675",
        relayer.address,
        "0",
        blockNumber,
        storageProofEncoded
      );
    });
  });
});
