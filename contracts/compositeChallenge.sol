// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CompositeChallenge {
    uint256 public constant T = 10; // Timeframe for solving the challenge in blocks

    struct Challenge {
        address creator;
        uint256 N;
        IERC20 token;
        uint256 reward;
        uint256 finishBlock;
        bool expired;
    }

    mapping(uint256 => Challenge) public challenges;
    uint256 public nextChallengeId;
    mapping(IERC20 => uint256) public prizePool;
    mapping(IERC20 => bool) public whitelistedTokens;

    event ChallengeCreated(
        uint256 challengeId,
        address creator,
        uint256 N,
        uint256 reward
    );
    event ChallengeSolved(uint256 challengeId, address solver, uint256 reward);
    event ChallengeExpired(
        uint256 challengeId,
        address creator,
        uint256 reward
    );

    constructor(IERC20[] memory tokens) {
        for (uint256 i = 0; i < tokens.length; i++) {
            whitelistedTokens[tokens[i]] = true;
        }
    }

    // Function to submit a new challenge with a reward in ERC20 tokens
    function submitChallenge(uint256 N, IERC20 token, uint256 reward) external {
        require(reward > 0, "Reward must be non-zero");
        require(N > 1, "N must be greater than 1");
        require(whitelistedTokens[token], "Token not whitelisted");

        token.transferFrom(msg.sender, address(this), reward);

        Challenge storage newChallenge = challenges[nextChallengeId++];
        newChallenge.creator = msg.sender;
        newChallenge.N = N;
        newChallenge.token = token;
        newChallenge.reward = reward;
        newChallenge.finishBlock = block.number + T;

        emit ChallengeCreated(nextChallengeId, msg.sender, N, reward);
    }

    // Function to attempt solving the challenge by proving N is composite
    function solveChallenge(uint256 challengeId, uint256 divisor) external {
        Challenge storage challenge = challenges[challengeId];

        require(!challenge.expired, "Challenge already claimed");
        require(block.number < challenge.finishBlock, "Challenge expired");
        require(divisor > 1 && divisor < challenge.N, "Invalid divisor");
        require(challenge.N % divisor == 0, "N is not divisible by divisor");

        // Update N by consuming the divisor
        challenge.N /= divisor;

        // Split reward: 50% to solver, 50% to prize pool
        uint256 solverReward = challenge.reward / 2;
        uint256 prizeReward = challenge.reward - solverReward;
        challenge.reward = solverReward;

        prizePool[challenge.token] += prizeReward;

        // Transfer solver reward
        challenge.token.transfer(msg.sender, solverReward);
        emit ChallengeSolved(challengeId, msg.sender, solverReward);
    }

    // Function to claim the reward if the challenge expires without a solution
    function claimExpiredChallenge(uint256 challengeId) external {
        Challenge storage challenge = challenges[challengeId];

        require(
            block.number >= challenge.finishBlock,
            "Challenge still active"
        );
        require(!challenge.expired, "Challenge already claimed");
        require(msg.sender == challenge.creator, "Only creator can claim");

        // Mark challenge as expired
        challenge.expired = true;

        // Transfer 100% of remaining reward back to challenge creator
        uint256 creatorReward = challenge.reward;

        // Transfer 50% of the prize pool amount to the challenge creator
        uint256 prizeReward = prizePool[challenge.token] / 2;
        prizePool[challenge.token] -= prizeReward;
        prizeReward += creatorReward;

        challenge.token.transfer(challenge.creator, prizeReward);
        emit ChallengeExpired(challengeId, challenge.creator, prizeReward);
    }
}
