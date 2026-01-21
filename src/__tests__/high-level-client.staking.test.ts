import { describe, it, expect, vi, beforeEach } from "vitest";
import { toBech32 } from "@cosmjs/encoding";
import { createClient } from "../high-level-client";
import { getNetworkConfig } from "../core/network";
import { signAndBroadcastEip712 } from "../eip712/sign-and-broadcast";

vi.mock("../eip712/sign-and-broadcast", () => ({
  signAndBroadcastEip712: vi.fn(),
}));

const signAndBroadcastMock = vi.mocked(signAndBroadcastEip712);

function makeAddress(prefix: string, lastByte: number): string {
  const bytes = new Uint8Array(20);
  bytes[19] = lastByte;
  return toBech32(prefix, bytes);
}

describe("High-level client staking txs", () => {
  const network = getNetworkConfig("ault_10904-1");
  const signerAddress = makeAddress("ault", 1);
  const validatorA = makeAddress("aultvaloper", 2);
  const validatorB = makeAddress("aultvaloper", 3);

  beforeEach(() => {
    signAndBroadcastMock.mockReset();
    signAndBroadcastMock.mockResolvedValue({
      txHash: "0xabc",
      code: 0,
      rawLog: "",
    });
  });

  it("builds MsgDelegate with normalized validator address", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    const result = await client.delegate({
      validatorAddress: validatorA,
      amount: { denom: "aault", amount: "100" },
    });

    expect(result.success).toBe(true);
    expect(signAndBroadcastMock).toHaveBeenCalledTimes(1);
    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs).toHaveLength(1);
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
      value: {
        delegatorAddress: signerAddress,
        validatorAddress: validatorA,
        amount: { denom: "aault", amount: "100" },
      },
    });
  });

  it("builds MsgUndelegate with normalized validator address", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.undelegate({
      validatorAddress: validatorA,
      amount: { denom: "aault", amount: "5" },
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
      value: {
        delegatorAddress: signerAddress,
        validatorAddress: validatorA,
        amount: { denom: "aault", amount: "5" },
      },
    });
  });

  it("builds MsgBeginRedelegate with normalized validator addresses", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.redelegate({
      validatorAddressSrc: validatorA,
      validatorAddressDst: validatorB,
      amount: { denom: "aault", amount: "42" },
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate",
      value: {
        delegatorAddress: signerAddress,
        validatorSrcAddress: validatorA,
        validatorDstAddress: validatorB,
        amount: { denom: "aault", amount: "42" },
      },
    });
  });

  it("builds one MsgWithdrawDelegatorReward per validator", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.withdrawRewards({
      validatorAddresses: [validatorA, validatorB],
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs).toHaveLength(2);
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
      value: { delegatorAddress: signerAddress, validatorAddress: validatorA },
    });
    expect(call.msgs[1]).toMatchObject({
      typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
      value: { delegatorAddress: signerAddress, validatorAddress: validatorB },
    });
  });

  it("throws on invalid validator address inputs", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await expect(
      client.delegate({
        validatorAddress: signerAddress,
        amount: { denom: "aault", amount: "1" },
      }),
    ).rejects.toThrow(/Invalid validator address format/);

    expect(signAndBroadcastMock).not.toHaveBeenCalled();
  });

  it("throws when withdrawRewards has no validators", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await expect(client.withdrawRewards({ validatorAddresses: [] })).rejects.toThrow(
      /validatorAddresses must include at least one validator address/,
    );
  });
});
