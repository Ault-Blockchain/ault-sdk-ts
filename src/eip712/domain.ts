export function getEip712Domain(evmChainId: number) {
  return {
    name: "Cosmos Web3",
    version: "1.0.0",
    chainId: evmChainId,
    verifyingContract: "cosmos",
    salt: "0",
  };
}
