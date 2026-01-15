export function parseEvmChainIdFromCosmosChainId(cosmosChainId: string): number | null {
  const match = cosmosChainId.match(/^[a-z]+_(\d+)-\d+$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}
