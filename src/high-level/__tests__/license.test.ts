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

describe("High-level client license txs", () => {
  const network = getNetworkConfig("ault_10904-1");
  const signerAddress = makeAddress("ault", 1);
  const recipientA = makeAddress("ault", 2);
  const recipientB = makeAddress("ault", 3);

  beforeEach(() => {
    signAndBroadcastMock.mockReset();
    signAndBroadcastMock.mockResolvedValue({
      txHash: "0xabc",
      code: 0,
      rawLog: "",
    });
  });

  it("builds MsgMintLicense and normalizes EVM recipient", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    const result = await client.mintLicense({
      to: aultToEvm(recipientA),
      uri: "ipfs://license/1",
    });

    expect(result.success).toBe(true);
    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgMintLicense",
      value: {
        minter: signerAddress,
        to: recipientA,
        uri: "ipfs://license/1",
        reason: "",
      },
    });
  });

  it("builds MsgBatchMintLicense with normalized recipients", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.batchMintLicense({
      recipients: [
        { to: recipientA, uri: "ipfs://license/1" },
        { to: aultToEvm(recipientB), uri: "ipfs://license/2" },
      ],
      reason: "airdrop",
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgBatchMintLicense",
      value: {
        minter: signerAddress,
        to: [recipientA, recipientB],
        uri: ["ipfs://license/1", "ipfs://license/2"],
        reason: "airdrop",
      },
    });
  });

  it("builds MsgTransferLicense with bigint conversion", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.transferLicense({
      licenseId: "42",
      to: recipientB,
      reason: "gift",
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgTransferLicense",
      value: {
        from: signerAddress,
        to: recipientB,
        licenseId: 42n,
        reason: "gift",
      },
    });
  });

  it("builds MsgBurnLicense and MsgRevokeLicense", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.burnLicense({ licenseId: 99, reason: "burn-test" });
    await client.revokeLicense({ licenseId: "100", reason: "revoke-test" });

    const burnCall = signAndBroadcastMock.mock.calls[0][0];
    expect(burnCall.msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgBurnLicense",
      value: {
        authority: signerAddress,
        id: 99n,
        reason: "burn-test",
      },
    });

    const revokeCall = signAndBroadcastMock.mock.calls[1][0];
    expect(revokeCall.msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgRevokeLicense",
      value: {
        authority: signerAddress,
        id: 100n,
        reason: "revoke-test",
      },
    });
  });

  it("builds MsgSetTokenURI", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.setTokenURI({
      licenseId: 42,
      uri: "ipfs://license/42",
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgSetTokenURI",
      value: {
        minter: signerAddress,
        id: 42n,
        uri: "ipfs://license/42",
      },
    });
  });

  it("builds member approval and revocation messages", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.approveMember({ member: recipientA });
    await client.batchApproveMember({ members: [recipientA, aultToEvm(recipientB)] });
    await client.revokeMember({ member: recipientA });
    await client.batchRevokeMember({ members: [recipientA, aultToEvm(recipientB)] });

    expect(signAndBroadcastMock.mock.calls[0][0].msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgApproveMember",
      value: { authority: signerAddress, member: recipientA },
    });
    expect(signAndBroadcastMock.mock.calls[1][0].msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgBatchApproveMember",
      value: { authority: signerAddress, members: [recipientA, recipientB] },
    });
    expect(signAndBroadcastMock.mock.calls[2][0].msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgRevokeMember",
      value: { authority: signerAddress, member: recipientA },
    });
    expect(signAndBroadcastMock.mock.calls[3][0].msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgBatchRevokeMember",
      value: { authority: signerAddress, members: [recipientA, recipientB] },
    });
  });

  it("builds MsgSetKYCApprovers and MsgSetMinters", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.setKYCApprovers({
      add: [recipientA],
      remove: [aultToEvm(recipientB)],
    });
    await client.setMinters({
      add: [aultToEvm(recipientA)],
      remove: [recipientB],
    });

    expect(signAndBroadcastMock.mock.calls[0][0].msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgSetKYCApprovers",
      value: { authority: signerAddress, add: [recipientA], remove: [recipientB] },
    });
    expect(signAndBroadcastMock.mock.calls[1][0].msgs[0]).toMatchObject({
      typeUrl: "/ault.license.v1.MsgSetMinters",
      value: { authority: signerAddress, add: [recipientA], remove: [recipientB] },
    });
  });

  it("throws on invalid address inputs", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await expect(
      client.setKYCApprovers({
        add: ["not-an-address"],
      }),
    ).rejects.toThrow(/Invalid address format/);

    expect(signAndBroadcastMock).not.toHaveBeenCalled();
  });
});
