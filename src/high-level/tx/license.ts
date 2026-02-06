import { msg } from "../../eip712/builder";
import { normalizeAddress, normalizeAddresses, toBigInt } from "../address-utils";
import type { LicenseTxApi } from "../types";
import type { TxModuleContext } from "./context";

export function createLicenseTxApi({ signerAddress, exec }: TxModuleContext): LicenseTxApi {
  return {
    async mintLicense({ to, uri, reason = "", gasLimit, memo }) {
      return exec(
        [
          msg.license.mintLicense({
            minter: signerAddress,
            to: normalizeAddress(to),
            uri,
            reason,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async batchMintLicense({ recipients, reason = "", gasLimit, memo }) {
      return exec(
        [
          msg.license.batchMintLicense({
            minter: signerAddress,
            to: recipients.map((r) => normalizeAddress(r.to)),
            uri: recipients.map((r) => r.uri),
            reason,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async transferLicense({ licenseId, to, reason = "", gasLimit, memo }) {
      return exec(
        [
          msg.license.transferLicense({
            from: signerAddress,
            to: normalizeAddress(to),
            licenseId: toBigInt(licenseId),
            reason,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async burnLicense({ licenseId, reason = "", gasLimit, memo }) {
      return exec(
        [
          msg.license.burnLicense({
            authority: signerAddress,
            id: toBigInt(licenseId),
            reason,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async revokeLicense({ licenseId, reason = "", gasLimit, memo }) {
      return exec(
        [
          msg.license.revokeLicense({
            authority: signerAddress,
            id: toBigInt(licenseId),
            reason,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async setTokenURI({ licenseId, uri, gasLimit, memo }) {
      return exec(
        [
          msg.license.setTokenURI({
            minter: signerAddress,
            id: toBigInt(licenseId),
            uri,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async approveMember({ member, gasLimit, memo }) {
      return exec(
        [
          msg.license.approveMember({
            authority: signerAddress,
            member: normalizeAddress(member),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async batchApproveMember({ members, gasLimit, memo }) {
      return exec(
        [
          msg.license.batchApproveMember({
            authority: signerAddress,
            members: normalizeAddresses(members),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async revokeMember({ member, gasLimit, memo }) {
      return exec(
        [
          msg.license.revokeMember({
            authority: signerAddress,
            member: normalizeAddress(member),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async batchRevokeMember({ members, gasLimit, memo }) {
      return exec(
        [
          msg.license.batchRevokeMember({
            authority: signerAddress,
            members: normalizeAddresses(members),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async setKYCApprovers({ add = [], remove = [], gasLimit, memo }) {
      return exec(
        [
          msg.license.setKYCApprovers({
            authority: signerAddress,
            add: normalizeAddresses(add),
            remove: normalizeAddresses(remove),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async setMinters({ add = [], remove = [], gasLimit, memo }) {
      return exec(
        [
          msg.license.setMinters({
            authority: signerAddress,
            add: normalizeAddresses(add),
            remove: normalizeAddresses(remove),
          }),
        ],
        { gasLimit, memo },
      );
    },
  };
}
