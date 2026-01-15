import { BinaryWriter } from "../tx-encode";
import { base64ToBytes, type Base64String } from "../../core/base64";

export interface MsgDelegateMining {
  owner: string;
  license_ids: bigint[];
  operator: string;
}

export const MsgDelegateMining = {
  typeUrl: "/ault.miner.v1.MsgDelegateMining",
  aminoType: "miner/MsgDelegateMining",
  encode(message: MsgDelegateMining): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.owner);
    writer.writeRepeatedUint64(2, message.license_ids);
    writer.writeString(3, message.operator);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgDelegateMining>): MsgDelegateMining {
    return {
      owner: object.owner ?? "",
      license_ids: object.license_ids ?? [],
      operator: object.operator ?? "",
    };
  },
};

export interface MsgCancelMiningDelegation {
  owner: string;
  license_ids: bigint[];
}

export const MsgCancelMiningDelegation = {
  typeUrl: "/ault.miner.v1.MsgCancelMiningDelegation",
  aminoType: "miner/MsgCancelMiningDelegation",
  encode(message: MsgCancelMiningDelegation): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.owner);
    writer.writeRepeatedUint64(2, message.license_ids);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgCancelMiningDelegation>): MsgCancelMiningDelegation {
    return {
      owner: object.owner ?? "",
      license_ids: object.license_ids ?? [],
    };
  },
};

export interface MsgSetOwnerVrfKey {
  vrf_pubkey: Base64String;
  possession_proof: Base64String;
  nonce: bigint;
  owner: string;
}

export const MsgSetOwnerVrfKey = {
  typeUrl: "/ault.miner.v1.MsgSetOwnerVrfKey",
  aminoType: "miner/MsgSetOwnerVrfKey",
  encode(message: MsgSetOwnerVrfKey): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeBytes(1, base64ToBytes(message.vrf_pubkey));
    writer.writeBytes(2, base64ToBytes(message.possession_proof));
    writer.writeUint64(3, message.nonce);
    writer.writeString(4, message.owner);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgSetOwnerVrfKey>): MsgSetOwnerVrfKey {
    return {
      vrf_pubkey: (object.vrf_pubkey ?? "") as Base64String,
      possession_proof: (object.possession_proof ?? "") as Base64String,
      nonce: object.nonce ?? 0n,
      owner: object.owner ?? "",
    };
  },
};

export interface MsgSubmitWork {
  license_id: bigint;
  epoch: bigint;
  y: Base64String;
  proof: Base64String;
  nonce: Base64String;
  submitter: string;
}

export const MsgSubmitWork = {
  typeUrl: "/ault.miner.v1.MsgSubmitWork",
  aminoType: "miner/MsgSubmitWork",
  encode(message: MsgSubmitWork): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeUint64(1, message.license_id);
    writer.writeUint64(2, message.epoch);
    writer.writeBytes(3, base64ToBytes(message.y));
    writer.writeBytes(4, base64ToBytes(message.proof));
    writer.writeBytes(5, base64ToBytes(message.nonce));
    writer.writeString(6, message.submitter);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgSubmitWork>): MsgSubmitWork {
    return {
      license_id: object.license_id ?? 0n,
      epoch: object.epoch ?? 0n,
      y: (object.y ?? "") as Base64String,
      proof: (object.proof ?? "") as Base64String,
      nonce: (object.nonce ?? "") as Base64String,
      submitter: object.submitter ?? "",
    };
  },
};

export interface WorkSubmission {
  license_id: bigint;
  epoch: bigint;
  y: Base64String;
  proof: Base64String;
  nonce: Base64String;
}

function encodeWorkSubmission(submission: WorkSubmission): Uint8Array {
  const writer = new BinaryWriter();
  writer.writeUint64(1, submission.license_id);
  writer.writeUint64(2, submission.epoch);
  writer.writeBytes(3, base64ToBytes(submission.y));
  writer.writeBytes(4, base64ToBytes(submission.proof));
  writer.writeBytes(5, base64ToBytes(submission.nonce));
  return writer.finish();
}

export interface MsgBatchSubmitWork {
  submissions: WorkSubmission[];
  submitter: string;
}

export const MsgBatchSubmitWork = {
  typeUrl: "/ault.miner.v1.MsgBatchSubmitWork",
  aminoType: "miner/MsgBatchSubmitWork",
  encode(message: MsgBatchSubmitWork): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    for (const submission of message.submissions) {
      writer.writeBytes(1, encodeWorkSubmission(submission));
    }
    writer.writeString(2, message.submitter);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgBatchSubmitWork>): MsgBatchSubmitWork {
    return {
      submissions: object.submissions ?? [],
      submitter: object.submitter ?? "",
    };
  },
};

export interface MinerParams {
  epoch_length_seconds: bigint;
  target_winners_per_epoch: bigint;
  max_winners_per_epoch: bigint;
  submission_window_seconds: bigint;
  controller_alpha_q16: bigint;
  controller_window: bigint;
  threshold_min: string;
  threshold_max: string;
  beacon_window_epochs: bigint;
  key_rotation_cooldown_seconds: bigint;
  vrf_verify_gas: bigint;
  min_key_age_epochs: bigint;
  initial_emission_per_epoch: string;
  emission_decay_rate: string;
  max_emission_years: bigint;
  max_payouts_per_block: bigint;
  max_epochs_per_block: bigint;
  staking_reward_percentage: bigint;
  max_commission_rate: bigint;
  max_commission_rate_increase_per_epoch: bigint;
  free_mining_until_epoch: bigint;
  free_mining_max_gas_limit: bigint;
  miner_allowed_msgs: string[];
  max_free_tx_per_epoch: bigint;
}

function encodeMinerParams(params: MinerParams): Uint8Array {
  const writer = new BinaryWriter();
  writer.writeUint64(1, params.epoch_length_seconds);
  writer.writeUint64(2, params.target_winners_per_epoch);
  writer.writeUint64(3, params.max_winners_per_epoch);
  writer.writeUint64(4, params.submission_window_seconds);
  writer.writeUint64(5, params.controller_alpha_q16);
  writer.writeUint64(6, params.controller_window);
  writer.writeString(7, params.threshold_min);
  writer.writeString(8, params.threshold_max);
  writer.writeUint64(9, params.beacon_window_epochs);
  writer.writeUint64(10, params.key_rotation_cooldown_seconds);
  writer.writeUint64(11, params.vrf_verify_gas);
  writer.writeUint64(12, params.min_key_age_epochs);
  writer.writeString(13, params.initial_emission_per_epoch);
  writer.writeString(14, params.emission_decay_rate);
  writer.writeUint64(15, params.max_emission_years);
  writer.writeUint64(16, params.max_payouts_per_block);
  writer.writeUint64(17, params.max_epochs_per_block);
  writer.writeUint64(18, params.staking_reward_percentage);
  writer.writeUint64(19, params.max_commission_rate);
  writer.writeUint64(20, params.max_commission_rate_increase_per_epoch);
  writer.writeUint64(21, params.free_mining_until_epoch);
  writer.writeUint64(22, params.free_mining_max_gas_limit);
  writer.writeRepeatedString(23, params.miner_allowed_msgs);
  writer.writeUint64(24, params.max_free_tx_per_epoch);
  return writer.finish();
}

export interface MsgUpdateParams {
  authority: string;
  params: MinerParams;
}

export const MsgUpdateParams = {
  typeUrl: "/ault.miner.v1.MsgUpdateParams",
  aminoType: "miner/MsgUpdateParams",
  encode(message: MsgUpdateParams): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    writer.writeBytes(2, encodeMinerParams(message.params));
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams {
    return {
      authority: object.authority ?? "",
      params: object.params ?? {
        epoch_length_seconds: 0n,
        target_winners_per_epoch: 0n,
        max_winners_per_epoch: 0n,
        submission_window_seconds: 0n,
        controller_alpha_q16: 0n,
        controller_window: 0n,
        threshold_min: "",
        threshold_max: "",
        beacon_window_epochs: 0n,
        key_rotation_cooldown_seconds: 0n,
        vrf_verify_gas: 0n,
        min_key_age_epochs: 0n,
        initial_emission_per_epoch: "",
        emission_decay_rate: "",
        max_emission_years: 0n,
        max_payouts_per_block: 0n,
        max_epochs_per_block: 0n,
        staking_reward_percentage: 0n,
        max_commission_rate: 0n,
        max_commission_rate_increase_per_epoch: 0n,
        free_mining_until_epoch: 0n,
        free_mining_max_gas_limit: 0n,
        miner_allowed_msgs: [],
        max_free_tx_per_epoch: 0n,
      },
    };
  },
};

export interface MsgRegisterOperator {
  operator: string;
  commission_rate: bigint;
  commission_recipient: string;
}

export const MsgRegisterOperator = {
  typeUrl: "/ault.miner.v1.MsgRegisterOperator",
  aminoType: "miner/MsgRegisterOperator",
  encode(message: MsgRegisterOperator): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.operator);
    writer.writeUint64(2, message.commission_rate);
    writer.writeString(3, message.commission_recipient);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgRegisterOperator>): MsgRegisterOperator {
    return {
      operator: object.operator ?? "",
      commission_rate: object.commission_rate ?? 0n,
      commission_recipient: object.commission_recipient ?? "",
    };
  },
};

export interface MsgUnregisterOperator {
  operator: string;
}

export const MsgUnregisterOperator = {
  typeUrl: "/ault.miner.v1.MsgUnregisterOperator",
  aminoType: "miner/MsgUnregisterOperator",
  encode(message: MsgUnregisterOperator): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.operator);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgUnregisterOperator>): MsgUnregisterOperator {
    return {
      operator: object.operator ?? "",
    };
  },
};

export interface MsgUpdateOperatorInfo {
  operator: string;
  new_commission_rate: bigint;
  new_commission_recipient: string;
}

export const MsgUpdateOperatorInfo = {
  typeUrl: "/ault.miner.v1.MsgUpdateOperatorInfo",
  aminoType: "miner/MsgUpdateOperatorInfo",
  encode(message: MsgUpdateOperatorInfo): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.operator);
    writer.writeUint64(2, message.new_commission_rate);
    writer.writeString(3, message.new_commission_recipient);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgUpdateOperatorInfo>): MsgUpdateOperatorInfo {
    return {
      operator: object.operator ?? "",
      new_commission_rate: object.new_commission_rate ?? 0n,
      new_commission_recipient: object.new_commission_recipient ?? "",
    };
  },
};

export interface MsgRedelegateMining {
  owner: string;
  license_ids: bigint[];
  new_operator: string;
}

export const MsgRedelegateMining = {
  typeUrl: "/ault.miner.v1.MsgRedelegateMining",
  aminoType: "miner/MsgRedelegateMining",
  encode(message: MsgRedelegateMining): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.owner);
    writer.writeRepeatedUint64(2, message.license_ids);
    writer.writeString(3, message.new_operator);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgRedelegateMining>): MsgRedelegateMining {
    return {
      owner: object.owner ?? "",
      license_ids: object.license_ids ?? [],
      new_operator: object.new_operator ?? "",
    };
  },
};
