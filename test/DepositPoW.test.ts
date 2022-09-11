import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import {
  defaultAbiCoder,
  hexZeroPad,
  keccak256,
  parseEther,
} from "ethers/lib/utils";
import { ethers } from "hardhat";

describe("DepositPoW", function () {
  const deployDepositPoWFixture = async () => {
    const [user, relayer] = await ethers.getSigners();
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
});
