# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# Unreleased

## [0.0.1] - 2026-02-05

### Added

- High-level client with simple transaction methods
- Flexible signer support (viem, ethers, Privy, MetaMask, private keys)
- REST query clients for License, Miner, and Exchange modules
- EIP-712 typed data signing
- Automatic address format conversion (0x <-> ault1)
- Automatic retry with exponential backoff
- Full TypeScript support with comprehensive type definitions

### License Transactions
- `mintLicense`, `batchMintLicense`
- `transferLicense`, `burnLicense`, `revokeLicense`
- `approveMember`, `revokeMember`, `batchApproveMember`
- `setMinters`, `setKYCApprovers`

### Miner Transactions
- `delegateMining`, `cancelMiningDelegation`, `redelegateMining`
- `setOwnerVrfKey`, `submitWork`, `batchSubmitWork`
- `registerOperator`, `unregisterOperator`, `updateOperatorInfo`

### Exchange Transactions
- `placeLimitOrder`, `placeMarketOrder`
- `cancelOrder`, `cancelAllOrders`
- `createMarket`
