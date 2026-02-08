#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

if [ ! -d "$REPO_ROOT/../ault/proto" ]; then
  echo "Ault proto directory not found at $REPO_ROOT/../ault/proto"
  exit 1
fi

if [ ! -d "$REPO_ROOT/../cosmos-sdk/proto" ]; then
  echo "Cosmos SDK proto directory not found at $REPO_ROOT/../cosmos-sdk/proto"
  exit 1
fi

echo "Generating TypeScript from ault protos..."
buf generate "$REPO_ROOT/../ault/proto" --template "$REPO_ROOT/buf.gen.yaml"

echo "Generating TypeScript from cosmos-sdk protos..."
buf generate "$REPO_ROOT/../cosmos-sdk/proto" --template "$REPO_ROOT/buf.gen.yaml" \
  --path cosmos/base/v1beta1/coin.proto \
  --path cosmos/staking/v1beta1/staking.proto \
  --path cosmos/staking/v1beta1/tx.proto \
  --path cosmos/distribution/v1beta1/distribution.proto \
  --path cosmos/distribution/v1beta1/tx.proto

echo "Generating EIP712 registry..."
node scripts/generate-eip712-registry.mjs

echo "Done!"
