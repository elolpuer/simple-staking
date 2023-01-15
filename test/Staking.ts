import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Staking", function () {

  const totalReward = ethers.utils.parseEther("30000")
  const duration = 86400 * 30 //30 days in seconds
  
  async function deployTokens() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TestToken");
    const usdt = await Token.deploy("USD Tether", "USDT")
    const ttt = await Token.deploy("TestToken", "TTT")

    return { usdt, ttt, owner, otherAccount };
  }

  async function deployStaking() {
    
    const { usdt, ttt, owner, otherAccount } = await deployTokens()

    const Staking = await ethers.getContractFactory("Staking");
    const staking = await Staking.deploy(
      usdt.address,  //staking token
      ttt.address    //reward token
    );

    await ttt.mint(staking.address, totalReward)
    await staking.setRewardsDuration(duration) 

    return { staking, owner, usdt, ttt, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { staking, owner } = await loadFixture(deployStaking);

      expect(await staking.owner()).to.equal(owner.address);
    });

    it("Should receive and store the funds from owner", async function () {
      const { staking, ttt } = await loadFixture(deployStaking);

      expect(await ttt.balanceOf(staking.address)).to.equal(
        totalReward
      );
    });

    it("Should check duration", async function () {
      const { staking } = await loadFixture(deployStaking);

      expect(await staking.duration()).to.equal(
        duration
      );
    });
  });

  // describe("Withdrawals", function () {
  //   describe("Validations", function () {
  //     it("Should revert with the right error if called too soon", async function () {
  //       const { lock } = await loadFixture(deployOneYearLockFixture);

  //       await expect(lock.withdraw()).to.be.revertedWith(
  //         "You can't withdraw yet"
  //       );
  //     });

  //     it("Should revert with the right error if called from another account", async function () {
  //       const { lock, unlockTime, otherAccount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // We can increase the time in Hardhat Network
  //       await time.increaseTo(unlockTime);

  //       // We use lock.connect() to send a transaction from another account
  //       await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
  //         "You aren't the owner"
  //       );
  //     });

  //     it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
  //       const { lock, unlockTime } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // Transactions are sent using the first signer by default
  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).not.to.be.reverted;
  //     });
  //   });

  //   describe("Events", function () {
  //     it("Should emit an event on withdrawals", async function () {
  //       const { lock, unlockTime, lockedAmount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw())
  //         .to.emit(lock, "Withdrawal")
  //         .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
  //     });
  //   });

  //   describe("Transfers", function () {
  //     it("Should transfer the funds to the owner", async function () {
  //       const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).to.changeEtherBalances(
  //         [owner, lock],
  //         [lockedAmount, -lockedAmount]
  //       );
  //     });
  //   });
  // });
});
