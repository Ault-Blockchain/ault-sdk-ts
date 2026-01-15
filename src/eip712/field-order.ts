import { EIP712_MSG_TYPES } from "./registry";

function validateFields(
  label: string,
  fields: readonly { name: string }[],
  errors: string[],
): void {
  const names = fields.map((f) => f.name);
  const sorted = [...names].sort((a, b) => b.localeCompare(a));
  for (let i = 0; i < names.length; i++) {
    if (names[i] !== sorted[i]) {
      errors.push(
        `${label}: fields are not in descending alphabetical order.\n` +
          `  Current:  [${names.join(", ")}]\n` +
          `  Expected: [${sorted.join(", ")}]`,
      );
      break;
    }
  }
}

export function validateEip712FieldOrder(): void {
  const errors: string[] = [];

  for (const [typeUrl, config] of Object.entries(EIP712_MSG_TYPES)) {
    validateFields(typeUrl, config.valueFields, errors);
    if (config.nestedTypes) {
      for (const [nestedName, nestedFields] of Object.entries(config.nestedTypes)) {
        validateFields(`${typeUrl} (nested: ${nestedName})`, nestedFields, errors);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `EIP-712 field order validation failed.\n\n` +
        `Fields MUST be in DESCENDING alphabetical order for Cosmos EVM signing.\n\n` +
        errors.join("\n\n"),
    );
  }
}

export function validateEip712FieldOrderInDev(): void {
  if (typeof process === "undefined") {
    return;
  }
  if (process.env && process.env.NODE_ENV === "production") {
    return;
  }
  validateEip712FieldOrder();
}
