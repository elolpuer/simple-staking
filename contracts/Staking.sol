// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Staking contract 
/// @notice Users can stake their stakingToken and get rewars in rewardsToken
/// @dev Owner can set duration of staking and totalAmount to share in this period
contract Staking is Ownable {
    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardsToken;

    /// @notice Duration of rewards to be paid out (in seconds)
    /// @return duration time in seconds
    uint public duration;

    /// @notice Timestamp of when the rewards finish
    /// @return finishAt time in seconds
    uint public finishAt;

    /// @notice Minimum of last updated time and reward finish time
    /// @return updatedAt time in seconds
    uint public updatedAt;

    /// @notice Reward to be paid out per second
    /// @return rewardRate tokens
    uint public rewardRate;

    /// @notice Sum of (reward rate * dt * 1e18 / total supply)
    /// @return rewardPerTokenStored rewards
    uint public rewardPerTokenStored;

    /// @notice User address => rewardPerTokenStored
    /// @return userRewardPerTokenPaid tokens paid
    mapping(address => uint) public userRewardPerTokenPaid;

    /// @notice User address => rewards to be claimed
    /// @return rewards tokens to be claimed
    mapping(address => uint) public rewards;

    /// @notice Total staked
    /// @return totalSupply total tokens supply
    uint public totalSupply;

    /// @notice User address => staked amount
    /// @return balanceOf user's staking tokens balance on contract 
    mapping(address => uint) public balanceOf;

    constructor(address _stakingToken, address _rewardToken) {
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardToken);
    }

    modifier updateReward(address _account) {
        rewardPerTokenStored = rewardPerToken();
        updatedAt = lastTimeRewardApplicable();

        if (_account != address(0)) {
            rewards[_account] = earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }

        _;
    }

    function lastTimeRewardApplicable() public view returns (uint) {
        return _min(finishAt, block.timestamp);
    }

    function rewardPerToken() public view returns (uint) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }

        return
            rewardPerTokenStored +
            (rewardRate * (lastTimeRewardApplicable() - updatedAt) * 1e18) /
            totalSupply;
    }

    /// @notice Stake tokens in contract
    /// @dev Transfers staking tokens from staker to this contract
    /// @param _amount amount of staking tokens to stake
    function stake(uint _amount) external updateReward(msg.sender) {
        require(_amount > 0, "amount = 0");
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        balanceOf[msg.sender] += _amount;
        totalSupply += _amount;
    }

    /// @notice Withdraw tokens from contract
    /// @dev Transfers staking tokens from contract to staker
    /// @param _amount amount of staking tokens to withdraw
    function withdraw(uint _amount) external updateReward(msg.sender) {
        require(_amount > 0, "amount = 0");
        balanceOf[msg.sender] -= _amount;
        totalSupply -= _amount;
        stakingToken.transfer(msg.sender, _amount);
    }

    /// @notice Shows earned tokens amount
    /// @param _account amount of staking tokens to withdraw
    /// @return uint earned tokens amount
    function earned(address _account) public view returns (uint) {
        return
            ((balanceOf[_account] *
                (rewardPerToken() - userRewardPerTokenPaid[_account])) / 1e18) +
            rewards[_account];
    }

    /// @notice Allows users to withdraw their rewards
    /// @dev Transfers user's reward tokens amount
    function getReward() external updateReward(msg.sender) {
        uint reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.transfer(msg.sender, reward);
        }
    }

    /// @notice Owner set duration
    function setRewardsDuration(uint _duration) external onlyOwner {
        require(finishAt < block.timestamp, "reward duration not finished");
        duration = _duration;
    }

    /// @notice Owner set reward amount
    function notifyRewardAmount(
        uint _amount
    ) external onlyOwner updateReward(address(0)) {
        if (block.timestamp >= finishAt) {  // reward duration expired or not started
            rewardRate = _amount / duration;
        } else {
            uint remainingRewards = (finishAt - block.timestamp) * rewardRate;
            rewardRate = (_amount + remainingRewards) / duration;
        }

        require(rewardRate > 0, "reward rate = 0");
        require(
            rewardRate * duration <= rewardsToken.balanceOf(address(this)),
            "reward amount > balance"
        );

        finishAt = block.timestamp + duration;
        updatedAt = block.timestamp;
    }

    function _min(uint x, uint y) private pure returns (uint) {
        return x <= y ? x : y;
    }
}

