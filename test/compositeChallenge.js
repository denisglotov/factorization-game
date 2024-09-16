const { expect } = require("chai");

describe("CompositeChallenge", function () {
  let compositeChallenge, testToken;
  let owner, alice, bob, charlie;
  const rewardAmount = ethers.parseUnits("100", 18);
  const initialSupply = ethers.parseUnits("1000", 18);

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();
    // Deploy test ERC20 token
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    testToken = await TestERC20.deploy(initialSupply);

    // Deploy the CompositeChallenge contract
    const CompositeChallenge =
      await ethers.getContractFactory("CompositeChallenge");
    compositeChallenge = await CompositeChallenge.deploy([testToken.target]);

    // Distribute tokens to Alice
    await testToken.transfer(alice.address, rewardAmount);
  });

  it("should allow Alice to submit a challenge", async function () {
    // Alice approves the contract to spend her tokens
    await testToken
      .connect(alice)
      .approve(compositeChallenge.target, rewardAmount);

    // Alice submits a challenge with N = 42
    expect(await compositeChallenge.nextChallengeId()).to.equal(0);
    await compositeChallenge
      .connect(alice)
      .submitChallenge(42, testToken.target, rewardAmount);
    expect(await compositeChallenge.nextChallengeId()).to.equal(1);

    const challenge = await compositeChallenge.challenges(0);
    expect(challenge.creator).to.equal(alice.address);
    expect(challenge.N).to.equal(42);
    expect(challenge.reward).to.equal(rewardAmount);
    expect(challenge.expired).to.equal(false);
  });

  it("should allow Bob to solve the challenge", async function () {
    // Alice submits a challenge with N = 42
    await testToken
      .connect(alice)
      .approve(compositeChallenge.target, rewardAmount);
    await compositeChallenge
      .connect(alice)
      .submitChallenge(42, testToken.target, rewardAmount);

    // Bob solves the challenge with divisor 6
    const halfReward = ethers.parseUnits("50", 18);
    await compositeChallenge.connect(bob).solveChallenge(0, 6);

    // Check that Bob receives half of the reward
    expect(await testToken.balanceOf(bob.address)).to.equal(halfReward);

    // Check that half of the reward is added to the prize pool
    expect(await compositeChallenge.prizePool(testToken.target)).to.equal(
      halfReward,
    );

    // Check that the remaining reward is now 50 tokens
    const challenge = await compositeChallenge.challenges(0);
    expect(challenge.reward).to.equal(halfReward);
  });

  it("should allow Charlie to solve the challenge after Bob", async function () {
    // Alice submits a challenge with N = 42
    await testToken
      .connect(alice)
      .approve(compositeChallenge.target, rewardAmount);
    await compositeChallenge
      .connect(alice)
      .submitChallenge(42, testToken.target, rewardAmount);

    // Bob solves the challenge with divisor 6
    await compositeChallenge.connect(bob).solveChallenge(0, 7);

    // Charlie solves the challenge with divisor 7
    const quarterReward = ethers.parseUnits("25", 18);
    await compositeChallenge.connect(charlie).solveChallenge(0, 3);

    // Check that Charlie receives 25 tokens (half of remaining 50 tokens)
    expect(await testToken.balanceOf(charlie.address)).to.equal(quarterReward);

    // Check that another 25 tokens are added to the prize pool
    expect(await compositeChallenge.prizePool(testToken.target)).to.equal(
      ethers.parseUnits("75", 18),
    );

    // Check that the remaining reward is now 25 tokens
    const challenge = await compositeChallenge.challenges(0);
    expect(challenge.reward).to.equal(quarterReward);
  });

  it("should allow Alice to claim the remaining reward after expiration", async function () {
    // Alice submits a challenge with N = 42
    await testToken
      .connect(alice)
      .approve(compositeChallenge.target, rewardAmount);
    await compositeChallenge
      .connect(alice)
      .submitChallenge(42, testToken.target, rewardAmount);

    // Move forward in time (simulate block increase)
    await ethers.provider.send("hardhat_mine", [10]);

    // Alice claims the expired challenge
    await compositeChallenge.connect(alice).claimExpiredChallenge(0);

    // Check that Alice receives 100 XYZ tokens (her reward)
    expect(await testToken.balanceOf(alice.address)).to.equal(rewardAmount);

    // Check that the remaining prize pool is now 0 tokens
    expect(await compositeChallenge.prizePool(testToken.target)).to.equal(0);
  });

  it("should prevent solving the same challenge with the same divisor", async function () {
    // Alice submits a challenge with N = 42
    await testToken
      .connect(alice)
      .approve(compositeChallenge.target, rewardAmount);
    await compositeChallenge
      .connect(alice)
      .submitChallenge(42, testToken.target, rewardAmount);

    // Bob solves the challenge with divisor 6
    await compositeChallenge.connect(bob).solveChallenge(0, 6);

    // Try solving again with the same divisor (should revert)
    await expect(
      compositeChallenge.connect(bob).solveChallenge(0, 6),
    ).to.be.revertedWith("N is not divisible by divisor");
  });

  it("should not allow Alice to claim the reward too early", async function () {
    // Alice submits a challenge with N = 42
    await testToken
      .connect(alice)
      .approve(compositeChallenge.target, rewardAmount);
    await compositeChallenge
      .connect(alice)
      .submitChallenge(42, testToken.target, rewardAmount);

    // Move forward in time (simulate block increase)
    await ethers.provider.send("hardhat_mine", [8]);

    // Attempt to claim the reward before the challenge expires (should revert)
    await expect(
      compositeChallenge.connect(alice).claimExpiredChallenge(0),
    ).to.be.revertedWith("Challenge still active");

    // Move forward in time (simulate block increase)
    await ethers.provider.send("hardhat_mine", [1]);

    // Now, Alice should be able to claim the expired challenge
    await compositeChallenge.connect(alice).claimExpiredChallenge(0);

    // Check that Alice receives her reward after expiry
    expect(await testToken.balanceOf(alice.address)).to.equal(rewardAmount);
  });
});
