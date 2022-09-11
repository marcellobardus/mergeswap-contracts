import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
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
    const depositPoW = await DepositPoW.deploy(relayer.address);
    return { user, relayer, depositPoW };
  };

  it("Should deposit", async function () {
    const { user, relayer, depositPoW } = await loadFixture(
      deployDepositPoWFixture
    );

    const tx = await depositPoW
      .connect(user)
      .deposit(parseEther("1"), { value: parseEther("1") });
    const receipt = await tx.wait();

    const depositsCount = await depositPoW.depositsCount();
    expect(depositsCount).equal(1);

    const deposit = await depositPoW.deposits(0);

    console.log(deposit);

    const paddedSlot = hexZeroPad(4, 32);
    const paddedKey = hexZeroPad(0, 32);
    const itemSlot = keccak256(paddedKey + paddedSlot.slice(2));

    const storageAt = await user.provider?.getStorageAt(
      depositPoW.address,
      itemSlot
    );

    console.log(BigNumber.from(storageAt));
  });
});
