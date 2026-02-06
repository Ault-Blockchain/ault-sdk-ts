import { describe, it, expect, vi, beforeEach } from "vitest";
import { toBech32 } from "@cosmjs/encoding";
import { createClient } from "../../high-level-client";
import { getNetworkConfig } from "../../core/network";
import { signAndBroadcastEip712 } from "../../eip712/sign-and-broadcast";
import { aultToEvm } from "../../utils/address";

vi.mock("../../eip712/sign-and-broadcast", () => ({
  signAndBroadcastEip712: vi.fn(),
}));

const signAndBroadcastMock = vi.mocked(signAndBroadcastEip712);

function makeAddress(prefix: string, lastByte: number): string {
  const bytes = new Uint8Array(20);
  bytes[19] = lastByte;
  return toBech32(prefix, bytes);
}

describe("High-level client miner txs", () => {
  const network = getNetworkConfig("ault_10904-1");
  const signerAddress = makeAddress("ault", 1);
  const operatorA = makeAddress("ault", 2);
  const operatorB = makeAddress("ault", 3);

  beforeEach(() => {
    signAndBroadcastMock.mockReset();
    signAndBroadcastMock.mockResolvedValue({
      txHash: "0xabc",
      code: 0,
      rawLog: "",
    });
  });

  it("builds MsgDelegateMining with bigint license ids and normalized operator", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.delegateMining({
      licenseIds: [1, "2", 3n],
      operator: aultToEvm(operatorA),
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.miner.v1.MsgDelegateMining",
      value: {
        owner: signerAddress,
        licenseIds: [1n, 2n, 3n],
        operator: operatorA,
      },
    });
  });

  it("builds MsgBatchSubmitWork with mapped submissions", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.batchSubmitWork({
      submissions: [
        { licenseId: 1, epoch: "10", y: new Uint8Array([1]), proof: new Uint8Array([2]) },
        { licenseId: "2", epoch: 11n, y: new Uint8Array([3]), proof: new Uint8Array([4]) },
      ],
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.miner.v1.MsgBatchSubmitWork",
      value: {
        submitter: signerAddress,
        submissions: [
          { licenseId: 1n, epoch: 10n, y: new Uint8Array([1]), proof: new Uint8Array([2]) },
          { licenseId: 2n, epoch: 11n, y: new Uint8Array([3]), proof: new Uint8Array([4]) },
        ],
      },
    });
  });

  it("builds MsgCancelMiningDelegation and MsgRedelegateMining", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.cancelMiningDelegation({ licenseIds: [1, "2"] });
    await client.redelegateMining({ licenseIds: [1, 2], newOperator: aultToEvm(operatorB) });

    expect(signAndBroadcastMock.mock.calls[0][0].msgs[0]).toMatchObject({
      typeUrl: "/ault.miner.v1.MsgCancelMiningDelegation",
      value: {
        owner: signerAddress,
        licenseIds: [1n, 2n],
      },
    });
    expect(signAndBroadcastMock.mock.calls[1][0].msgs[0]).toMatchObject({
      typeUrl: "/ault.miner.v1.MsgRedelegateMining",
      value: {
        owner: signerAddress,
        licenseIds: [1n, 2n],
        newOperator: operatorB,
      },
    });
  });

  it("builds MsgSetOwnerVrfKey and MsgSubmitWork", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.setOwnerVrfKey({
      vrfPubkey: new Uint8Array([1, 2]),
      possessionProof: new Uint8Array([3, 4]),
      nonce: 9,
    });
    await client.submitWork({
      licenseId: "4",
      epoch: 10,
      y: new Uint8Array([5]),
      proof: new Uint8Array([6]),
    });

    expect(signAndBroadcastMock.mock.calls[0][0].msgs[0]).toMatchObject({
      typeUrl: "/ault.miner.v1.MsgSetOwnerVrfKey",
      value: {
        owner: signerAddress,
        vrfPubkey: new Uint8Array([1, 2]),
        possessionProof: new Uint8Array([3, 4]),
        nonce: 9n,
      },
    });
    expect(signAndBroadcastMock.mock.calls[1][0].msgs[0]).toMatchObject({
      typeUrl: "/ault.miner.v1.MsgSubmitWork",
      value: {
        submitter: signerAddress,
        licenseId: 4n,
        epoch: 10n,
        y: new Uint8Array([5]),
        proof: new Uint8Array([6]),
      },
    });
  });

  it("defaults commission recipient to signer address", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.registerOperator({
      commissionRate: 7,
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.miner.v1.MsgRegisterOperator",
      value: {
        operator: signerAddress,
        commissionRate: 7,
        commissionRecipient: signerAddress,
      },
    });
  });

  it("builds MsgUpdateOperatorInfo with normalized new recipient", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.updateOperatorInfo({
      newCommissionRate: 8,
      newCommissionRecipient: aultToEvm(operatorB),
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.miner.v1.MsgUpdateOperatorInfo",
      value: {
        operator: signerAddress,
        newCommissionRate: 8,
        newCommissionRecipient: operatorB,
      },
    });
  });

  it("builds MsgUnregisterOperator", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.unregisterOperator();

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.miner.v1.MsgUnregisterOperator",
      value: { operator: signerAddress },
    });
  });

  it("throws on invalid operator address", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await expect(
      client.delegateMining({
        licenseIds: [1],
        operator: "invalid-address",
      }),
    ).rejects.toThrow(/Invalid address format/);

    expect(signAndBroadcastMock).not.toHaveBeenCalled();
  });
});
