import { ethers } from "hardhat";

const totalReward = ethers.utils.parseEther("30000")
const oneDay = 86400
const duration = oneDay * 30 //30 days in seconds

async function main() {
  const Token = await ethers.getContractFactory("TestToken");
  const usdt = await Token.deploy("USD Tether", "USDT")
  const ttt = await Token.deploy("TestToken", "TTT")
  
  await usdt.deployed();
  await ttt.deployed();

  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(
    usdt.address,  //staking token
    ttt.address    //reward token
  );

  await ttt.mint(staking.address, totalReward)
  await staking.setRewardsDuration(duration)
  await staking.notifyRewardAmount(totalReward)

  await staking.deployed();

  console.log(`Staking contract deployed to address: ${staking.address}`);
  console.log(`USDT contract deployed to address: ${usdt.address}`);
  console.log(`TTT contract deployed to address: ${ttt.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
