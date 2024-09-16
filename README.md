# CompositeChallenge Smart Contract

[![CI](https://github.com/denisglotov/factorization-game/actions/workflows/ci.yml/badge.svg)](https://github.com/denisglotov/factorization-game/actions)

This project implements a Solidity smart contract called `CompositeChallenge` that allows users to create and solve
mathematical challenges involving composite numbers. The contract uses ERC20 tokens as rewards, and only whitelisted
tokens are accepted.

## Features

- Users can submit challenges with a reward in ERC20 tokens.
- Other users can solve challenges by providing a divisor that proves the submitted number is composite.
- Expired challenges return the reward to the challenge creator.
- Only whitelisted tokens are accepted for rewards.

## Prerequisites

- [Node.js](https://nodejs.org/en/download/) (v20 or higher)
- [Hardhat](https://hardhat.org/) for testing and local blockchain simulation

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/composite-challenge.git
   cd composite-challenge
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## Usage

### Running Tests

You can run the smart contract tests using Hardhat:

```bash
npm run test
```

## Smart Contract Overview

The `CompositeChallenge` contract allows users to:
- Submit challenges with a number \(N\) and a reward in a whitelisted ERC20 token.
- Solve challenges by providing a divisor of \(N\), proving it is composite.
- Claim back rewards if no one solves the challenge before it expires.

## License

This project is licensed under the MIT License.
