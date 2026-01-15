import { BinaryWriter } from "../tx-encode";

export interface MsgMintLicense {
  minter: string;
  to: string;
  uri: string;
  reason: string;
}

export const MsgMintLicense = {
  typeUrl: "/ault.license.v1.MsgMintLicense",
  aminoType: "license/MsgMintLicense",
  encode(message: MsgMintLicense): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.minter);
    writer.writeString(2, message.to);
    writer.writeString(3, message.uri);
    writer.writeString(4, message.reason);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgMintLicense>): MsgMintLicense {
    return {
      minter: object.minter ?? "",
      to: object.to ?? "",
      uri: object.uri ?? "",
      reason: object.reason ?? "",
    };
  },
};

export interface MsgBatchMintLicense {
  minter: string;
  to: string[];
  uri: string[];
  reason: string;
}

export const MsgBatchMintLicense = {
  typeUrl: "/ault.license.v1.MsgBatchMintLicense",
  aminoType: "license/MsgBatchMintLicense",
  encode(message: MsgBatchMintLicense): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.minter);
    writer.writeRepeatedString(2, message.to);
    writer.writeRepeatedString(3, message.uri);
    writer.writeString(4, message.reason);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgBatchMintLicense>): MsgBatchMintLicense {
    return {
      minter: object.minter ?? "",
      to: object.to ?? [],
      uri: object.uri ?? [],
      reason: object.reason ?? "",
    };
  },
};

export interface MsgApproveMember {
  authority: string;
  member: string;
}

export const MsgApproveMember = {
  typeUrl: "/ault.license.v1.MsgApproveMember",
  aminoType: "license/MsgApproveMember",
  encode(message: MsgApproveMember): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    writer.writeString(2, message.member);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgApproveMember>): MsgApproveMember {
    return {
      authority: object.authority ?? "",
      member: object.member ?? "",
    };
  },
};

export interface MsgRevokeMember {
  authority: string;
  member: string;
}

export const MsgRevokeMember = {
  typeUrl: "/ault.license.v1.MsgRevokeMember",
  aminoType: "license/MsgRevokeMember",
  encode(message: MsgRevokeMember): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    writer.writeString(2, message.member);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgRevokeMember>): MsgRevokeMember {
    return {
      authority: object.authority ?? "",
      member: object.member ?? "",
    };
  },
};

export interface MsgBatchApproveMember {
  authority: string;
  members: string[];
}

export const MsgBatchApproveMember = {
  typeUrl: "/ault.license.v1.MsgBatchApproveMember",
  aminoType: "license/MsgBatchApproveMember",
  encode(message: MsgBatchApproveMember): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    writer.writeRepeatedString(2, message.members);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgBatchApproveMember>): MsgBatchApproveMember {
    return {
      authority: object.authority ?? "",
      members: object.members ?? [],
    };
  },
};

export interface MsgBatchRevokeMember {
  authority: string;
  members: string[];
}

export const MsgBatchRevokeMember = {
  typeUrl: "/ault.license.v1.MsgBatchRevokeMember",
  aminoType: "license/MsgBatchRevokeMember",
  encode(message: MsgBatchRevokeMember): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    writer.writeRepeatedString(2, message.members);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgBatchRevokeMember>): MsgBatchRevokeMember {
    return {
      authority: object.authority ?? "",
      members: object.members ?? [],
    };
  },
};

export interface MsgRevokeLicense {
  authority: string;
  id: bigint;
  reason: string;
}

export const MsgRevokeLicense = {
  typeUrl: "/ault.license.v1.MsgRevokeLicense",
  aminoType: "license/MsgRevokeLicense",
  encode(message: MsgRevokeLicense): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    writer.writeUint64(2, message.id);
    writer.writeString(3, message.reason);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgRevokeLicense>): MsgRevokeLicense {
    return {
      authority: object.authority ?? "",
      id: object.id ?? 0n,
      reason: object.reason ?? "",
    };
  },
};

export interface MsgBurnLicense {
  authority: string;
  id: bigint;
  reason: string;
}

export const MsgBurnLicense = {
  typeUrl: "/ault.license.v1.MsgBurnLicense",
  aminoType: "license/MsgBurnLicense",
  encode(message: MsgBurnLicense): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    writer.writeUint64(2, message.id);
    writer.writeString(3, message.reason);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgBurnLicense>): MsgBurnLicense {
    return {
      authority: object.authority ?? "",
      id: object.id ?? 0n,
      reason: object.reason ?? "",
    };
  },
};

export interface MsgSetTokenURI {
  minter: string;
  id: bigint;
  uri: string;
}

export const MsgSetTokenURI = {
  typeUrl: "/ault.license.v1.MsgSetTokenURI",
  aminoType: "license/MsgSetTokenURI",
  encode(message: MsgSetTokenURI): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.minter);
    writer.writeUint64(2, message.id);
    writer.writeString(3, message.uri);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgSetTokenURI>): MsgSetTokenURI {
    return {
      minter: object.minter ?? "",
      id: object.id ?? 0n,
      uri: object.uri ?? "",
    };
  },
};

export interface MsgSetMinters {
  authority: string;
  add: string[];
  remove: string[];
}

export const MsgSetMinters = {
  typeUrl: "/ault.license.v1.MsgSetMinters",
  aminoType: "license/MsgSetMinters",
  encode(message: MsgSetMinters): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    writer.writeRepeatedString(2, message.add);
    writer.writeRepeatedString(3, message.remove);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgSetMinters>): MsgSetMinters {
    return {
      authority: object.authority ?? "",
      add: object.add ?? [],
      remove: object.remove ?? [],
    };
  },
};

export interface LicenseParams {
  class_name: string;
  class_symbol: string;
  base_token_uri: string;
  minting_paused: boolean;
  supply_cap: bigint;
  allow_metadata_update: boolean;
  admin_can_revoke: boolean;
  admin_can_burn: boolean;
  max_batch_mint_size: bigint;
  transfer_unlock_days: bigint;
  enable_transfers: boolean;
  minter_allowed_msgs: string[];
  kyc_approver_allowed_msgs: string[];
  free_max_gas_limit: bigint;
  max_voting_power_per_address: bigint;
}

function encodeLicenseParams(params: LicenseParams): Uint8Array {
  const writer = new BinaryWriter();
  writer.writeString(1, params.class_name);
  writer.writeString(2, params.class_symbol);
  writer.writeString(3, params.base_token_uri);
  writer.writeBool(4, params.minting_paused);
  writer.writeUint64(5, params.supply_cap);
  writer.writeBool(6, params.allow_metadata_update);
  writer.writeBool(7, params.admin_can_revoke);
  writer.writeBool(8, params.admin_can_burn);
  writer.writeUint64(9, params.max_batch_mint_size);
  writer.writeUint64(10, params.transfer_unlock_days);
  writer.writeBool(11, params.enable_transfers);
  writer.writeRepeatedString(12, params.minter_allowed_msgs);
  writer.writeRepeatedString(13, params.kyc_approver_allowed_msgs);
  writer.writeUint64(14, params.free_max_gas_limit);
  writer.writeUint64(15, params.max_voting_power_per_address);
  return writer.finish();
}

export interface MsgSetParams {
  authority: string;
  params: LicenseParams;
}

export const MsgSetParams = {
  typeUrl: "/ault.license.v1.MsgSetParams",
  aminoType: "license/MsgSetParams",
  encode(message: MsgSetParams): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    writer.writeBytes(2, encodeLicenseParams(message.params));
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgSetParams>): MsgSetParams {
    return {
      authority: object.authority ?? "",
      params: object.params ?? {
        class_name: "",
        class_symbol: "",
        base_token_uri: "",
        minting_paused: false,
        supply_cap: 0n,
        allow_metadata_update: false,
        admin_can_revoke: false,
        admin_can_burn: false,
        max_batch_mint_size: 0n,
        transfer_unlock_days: 0n,
        enable_transfers: false,
        minter_allowed_msgs: [],
        kyc_approver_allowed_msgs: [],
        free_max_gas_limit: 0n,
        max_voting_power_per_address: 0n,
      },
    };
  },
};

export interface MsgUpdateParams {
  authority: string;
  params: LicenseParams;
}

export const MsgUpdateParams = {
  typeUrl: "/ault.license.v1.MsgUpdateParams",
  aminoType: "license/MsgUpdateParams",
  encode(message: MsgUpdateParams): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    writer.writeBytes(2, encodeLicenseParams(message.params));
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams {
    return {
      authority: object.authority ?? "",
      params: object.params ?? {
        class_name: "",
        class_symbol: "",
        base_token_uri: "",
        minting_paused: false,
        supply_cap: 0n,
        allow_metadata_update: false,
        admin_can_revoke: false,
        admin_can_burn: false,
        max_batch_mint_size: 0n,
        transfer_unlock_days: 0n,
        enable_transfers: false,
        minter_allowed_msgs: [],
        kyc_approver_allowed_msgs: [],
        free_max_gas_limit: 0n,
        max_voting_power_per_address: 0n,
      },
    };
  },
};

export interface MsgSetKYCApprovers {
  authority: string;
  add: string[];
  remove: string[];
}

export const MsgSetKYCApprovers = {
  typeUrl: "/ault.license.v1.MsgSetKYCApprovers",
  aminoType: "license/MsgSetKYCApprovers",
  encode(message: MsgSetKYCApprovers): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    writer.writeRepeatedString(2, message.add);
    writer.writeRepeatedString(3, message.remove);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgSetKYCApprovers>): MsgSetKYCApprovers {
    return {
      authority: object.authority ?? "",
      add: object.add ?? [],
      remove: object.remove ?? [],
    };
  },
};

export interface MsgTransferLicense {
  from: string;
  to: string;
  license_id: bigint;
  reason: string;
}

export const MsgTransferLicense = {
  typeUrl: "/ault.license.v1.MsgTransferLicense",
  aminoType: "license/MsgTransferLicense",
  encode(message: MsgTransferLicense): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.from);
    writer.writeString(2, message.to);
    writer.writeUint64(3, message.license_id);
    writer.writeString(4, message.reason);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgTransferLicense>): MsgTransferLicense {
    return {
      from: object.from ?? "",
      to: object.to ?? "",
      license_id: object.license_id ?? 0n,
      reason: object.reason ?? "",
    };
  },
};
