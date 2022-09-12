# MergeSwap Contracts

## Getting Started

Create a `.env` file with actual values (see `.env.example` as an example format).

Install the packages:
```shell
yarn
```

## Compile
```shell
npx hardhat compile
```

## Test
```shell
GAS_REPORT=true npx hardhat test
```

### Deploy & Verify bytecode
```shell
npm run deploy:pow

npm run deploy:pos
```