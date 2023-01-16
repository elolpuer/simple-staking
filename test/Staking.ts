import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Staking", function () {

  const totalReward = ethers.utils.parseEther("30000")
  const otherAccountAmount = ethers.utils.parseEther("90")
  const otherAccount1Amount = ethers.utils.parseEther("10")
  const rewardOneDay = ethers.utils.parseEther("1000")
  const rewardOneDayProportion9 = ethers.utils.parseEther("900")
  const rewardOneDayProportion1 = ethers.utils.parseEther("100")
  const rewardDiffInTimeHalfADayProportion9 = ethers.utils.parseEther("450")
  const rewardDiffInTimeHalfADayProportion1 = ethers.utils.parseEther("550")
  const oneDay = 86400
  const duration = oneDay * 30 //30 days in seconds
  
  async function deployTokens() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, otherAccount1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TestToken");
    const usdt = await Token.deploy("USD Tether", "USDT")
    const ttt = await Token.deploy("TestToken", "TTT")

    return { usdt, ttt, owner, otherAccount, otherAccount1 };
  }

  async function deployStaking() {
    
    const { usdt, ttt, owner, otherAccount, otherAccount1 } = await deployTokens()

    const Staking = await ethers.getContractFactory("Staking");
    const staking = await Staking.deploy(
      usdt.address,  //staking token
      ttt.address    //reward token
    );

    await ttt.mint(staking.address, totalReward)
    await usdt.mint(otherAccount.address, otherAccountAmount)
    await usdt.mint(otherAccount1.address, otherAccount1Amount)
    await staking.setRewardsDuration(duration)
    await staking.notifyRewardAmount(totalReward)

    return { staking, owner, usdt, ttt, otherAccount, otherAccount1 };
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

  describe("Deposit/Withdraw", function () {
      it("Should stake USDT, get reward in 1 day and withdraw", async function () {
        const { staking, usdt, ttt, otherAccount } = await loadFixture(deployStaking);
        //STAKING
        //approve tokens to staking contract
        await usdt.connect(otherAccount).approve(staking.address, otherAccountAmount)
        //check allowance
        expect(
          await usdt.allowance(otherAccount.address, staking.address)
        ).to.be.equal(otherAccountAmount)
        //stake tokens
        await staking.connect(otherAccount).stake(otherAccountAmount)

        //UTILS
        //increase time by 1 day
        await time.increase(oneDay)

        //WITHDRAW
        //check if before withdraw staking token balance is 0
        expect(
          await usdt.balanceOf(otherAccount.address)
        ).to.be.equal(0)
        //withdraw staking tokens
        await staking.connect(otherAccount).withdraw(otherAccountAmount)
        //check if after withdraw staking token balance is not 0
        expect(
          await usdt.balanceOf(otherAccount.address)
        ).to.be.equal(otherAccountAmount)

        //REWARD
        //check if before reward balance is 0
        expect(
          await ttt.balanceOf(otherAccount.address)
        ).to.be.equal(0)
        //get reward in reward tokens
        await staking.connect(otherAccount).getReward()
        //current balance should be approximately equal to rewardPerOneDay
        //because only one user in staking contract
        expect(
          await ttt.balanceOf(otherAccount.address)
        ).to.be.approximately(rewardOneDay, ethers.utils.parseEther("0.1"))
      });

      it("Should 2 users stake USDT at the same time in proportion 9/1, get reward in 1 day and withdraw", async function () {
        const { staking, usdt, ttt, otherAccount, otherAccount1 } = await loadFixture(deployStaking);
        //STAKING
        //approve tokens to staking contract
        await usdt.connect(otherAccount).approve(staking.address, otherAccountAmount)
        await usdt.connect(otherAccount1).approve(staking.address, otherAccount1Amount)
        //stake tokens
        await staking.connect(otherAccount).stake(otherAccountAmount)
        await staking.connect(otherAccount1).stake(otherAccount1Amount)

        //UTILS
        //increase time by 1 day
        await time.increase(oneDay)

        //WITHDRAW
        //check if before withdraw staking token balance is 0
        expect(
          await usdt.balanceOf(otherAccount.address)
        ).to.be.equal(0)
        expect(
          await usdt.balanceOf(otherAccount1.address)
        ).to.be.equal(0)
        //withdraw staking tokens
        await staking.connect(otherAccount).withdraw(otherAccountAmount)
        await staking.connect(otherAccount1).withdraw(otherAccount1Amount)
        //check if after withdraw staking token balance is not 0
        expect(
          await usdt.balanceOf(otherAccount.address)
        ).to.be.equal(otherAccountAmount)
        expect(
          await usdt.balanceOf(otherAccount1.address)
        ).to.be.equal(otherAccount1Amount)

        //REWARD
        //check if before reward balance is 0
        expect(
          await ttt.balanceOf(otherAccount.address)
        ).to.be.equal(0)
        expect(
          await ttt.balanceOf(otherAccount1.address)
        ).to.be.equal(0)
        //get reward in reward tokens
        await staking.connect(otherAccount).getReward()
        await staking.connect(otherAccount1).getReward()
        //current balance should be approximately equal to rewardOneDayProportion9 and rewardOneDayProportion1
        //because 1st user have 90% of totalAmount and 2nd have 10% of totalAmount
        expect(
          await ttt.balanceOf(otherAccount.address)
        ).to.be.approximately(rewardOneDayProportion9, ethers.utils.parseEther("0.1"))
        expect(
          await ttt.balanceOf(otherAccount1.address)
        ).to.be.approximately(rewardOneDayProportion1, ethers.utils.parseEther("0.1"))
      });

      it("Should 2 users stake USDT in with a time difference of half a day proportion 9/1, get reward in 1 day and withdraw", async function () {
        const { staking, usdt, ttt, otherAccount, otherAccount1 } = await loadFixture(deployStaking);
        //IN THIS TEST account1 will get more token than account because account1 staked tokens earlier than account
        //it's happend even if account staked more token than account1
        //because account1 had all the contract tokens on the balance for this day
        //STAKING
        //approve tokens to staking contract
        await usdt.connect(otherAccount).approve(staking.address, otherAccountAmount)
        await usdt.connect(otherAccount1).approve(staking.address, otherAccount1Amount)
        //stake tokens
        await staking.connect(otherAccount1).stake(otherAccount1Amount)
        //UTILS
        //increase time by half a day
        await time.increase(oneDay / 2)
        await staking.connect(otherAccount).stake(otherAccountAmount)

        //UTILS
        //increase time by half a day
        await time.increase(oneDay / 2)

        //WITHDRAW
        //check if before withdraw staking token balance is 0
        expect(
          await usdt.balanceOf(otherAccount.address)
        ).to.be.equal(0)
        expect(
          await usdt.balanceOf(otherAccount1.address)
        ).to.be.equal(0)
        //withdraw staking tokens
        await staking.connect(otherAccount).withdraw(otherAccountAmount)
        await staking.connect(otherAccount1).withdraw(otherAccount1Amount)
        //check if after withdraw staking token balance is not 0
        expect(
          await usdt.balanceOf(otherAccount.address)
        ).to.be.equal(otherAccountAmount)
        expect(
          await usdt.balanceOf(otherAccount1.address)
        ).to.be.equal(otherAccount1Amount)

        //REWARD
        //check if before reward balance is 0
        expect(
          await ttt.balanceOf(otherAccount.address)
        ).to.be.equal(0)
        expect(
          await ttt.balanceOf(otherAccount1.address)
        ).to.be.equal(0)
        //get reward in reward tokens
        await staking.connect(otherAccount).getReward()
        await staking.connect(otherAccount1).getReward()
        //current balance should be approximately equal to rewardOneDayProportion9 and rewardOneDayProportion1
        //because 1st user have 90% of totalAmount and 2nd have 10% of totalAmount
        expect(
          await ttt.balanceOf(otherAccount.address)
        ).to.be.approximately(rewardDiffInTimeHalfADayProportion9, ethers.utils.parseEther("0.1"))
        expect(
          await ttt.balanceOf(otherAccount1.address)
        ).to.be.approximately(rewardDiffInTimeHalfADayProportion1, ethers.utils.parseEther("0.1"))
      });

      it('Should check if staking will end in 30 days', async () => {
        const { staking, usdt, ttt, otherAccount } = await loadFixture(deployStaking);
        //increase time
        await time.increase(duration)
        //stake
        await usdt.connect(otherAccount).approve(staking.address, otherAccountAmount)
        await staking.connect(otherAccount).stake(otherAccountAmount)
        //increase time again to be sure that we staked tokens
        await time.increase(oneDay)
        //should be 0 because time is end
        expect(
          await staking.earned(otherAccount.address)
        ).to.be.equal(0)
      })

  });
});
