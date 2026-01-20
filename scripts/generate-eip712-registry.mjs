/* eslint-disable no-useless-escape */
import { promises as fs } from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const PROTO_BASE = path.resolve(REPO_ROOT, "../ault/proto");
const PROTO_ROOT = path.resolve(PROTO_BASE, "ault");

const OUTPUT_REGISTRY_PATH = path.resolve(REPO_ROOT, "src/eip712/registry.generated.ts");
const OUTPUT_MSG_BUILDERS_PATH = path.resolve(REPO_ROOT, "src/eip712/msg.generated.ts");
const OUTPUT_MSG_ENCODERS_PATH = path.resolve(REPO_ROOT, "src/eip712/msg-encoders.generated.ts");

const REGISTRY_OVERRIDES = {
  "/ault.exchange.v1beta1.MsgCancelOrder": {
    legacyAminoRegistered: false,
  },
};

const FIELD_DEFAULT_OVERRIDES = new Map([
  ["ault.miner.v1.MsgRegisterOperator.commissionRecipient", ""],
  ["ault.miner.v1.MsgUpdateOperatorInfo.newCommissionRecipient", ""],
]);

const REGISTRY_STRING_TYPES = new Set([
  "string",
  "bytes",
  "int32",
  "uint32",
  "sint32",
  "fixed32",
  "sfixed32",
  "int64",
  "uint64",
  "sint64",
  "fixed64",
  "sfixed64",
  "double",
  "float",
  "google.protobuf.Timestamp",
  ".google.protobuf.Timestamp",
  "Timestamp",
]);

const REGISTRY_BOOL_TYPES = new Set(["bool"]);

const REGISTRY_DURATION_TYPES = new Set([
  "google.protobuf.Duration",
  ".google.protobuf.Duration",
  "Duration",
]);

const SCALAR_STRING_TYPES = new Set(["string"]);
const SCALAR_BYTES_TYPES = new Set(["bytes"]);
const SCALAR_BOOL_TYPES = new Set(["bool"]);
const SCALAR_INT32_TYPES = new Set(["int32", "sint32", "sfixed32"]);
const SCALAR_UINT32_TYPES = new Set(["uint32", "fixed32"]);
const SCALAR_INT64_TYPES = new Set(["int64", "sint64", "sfixed64"]);
const SCALAR_UINT64_TYPES = new Set(["uint64", "fixed64"]);
const SCALAR_FLOAT_TYPES = new Set(["double", "float"]);

const SCALAR_DURATION_TYPES = new Set([
  "google.protobuf.Duration",
  ".google.protobuf.Duration",
  "Duration",
]);

const SCALAR_TIMESTAMP_TYPES = new Set([
  "google.protobuf.Timestamp",
  ".google.protobuf.Timestamp",
  "Timestamp",
]);

function stripComments(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

async function listProtoFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listProtoFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".proto")) {
      files.push(fullPath);
    }
  }
  return files;
}

function countBraces(text) {
  let count = 0;
  for (const char of text) {
    if (char === "{") count += 1;
    if (char === "}") count -= 1;
  }
  return count;
}

function parseMessageBody(body) {
  const fields = [];
  const lines = body.split(/\r?\n/);
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (depth === 0 && /^(message|enum|oneof)\b/.test(trimmed)) {
      depth += countBraces(trimmed);
      continue;
    }

    if (depth === 0) {
      const fieldMatch = trimmed.match(
        /^(repeated\s+)?(?:optional\s+)?([A-Za-z0-9_.]+)\s+([A-Za-z0-9_]+)\s*=\s*\d+/, // proto field
      );
      if (fieldMatch) {
        fields.push({
          repeated: Boolean(fieldMatch[1]),
          type: fieldMatch[2],
          name: fieldMatch[3],
        });
      }
    }

    depth += countBraces(trimmed);
  }

  return fields;
}

function extractMessageBlocks(text) {
  const messages = [];
  const regex = /message\s+([A-Za-z0-9_]+)\s*\{/g;
  let match;

  while ((match = regex.exec(text))) {
    const name = match[1];
    const startIndex = text.indexOf("{", match.index);
    if (startIndex === -1) {
      continue;
    }
    let depth = 0;
    let endIndex = startIndex;
    for (; endIndex < text.length; endIndex++) {
      if (text[endIndex] === "{") depth += 1;
      if (text[endIndex] === "}") {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }
    const body = text.slice(startIndex + 1, endIndex);
    messages.push({ name, body });
    regex.lastIndex = endIndex + 1;
  }

  return messages;
}

function resolveTypeName(typeName, pkg) {
  if (typeName.startsWith(".")) {
    return typeName.slice(1);
  }
  if (typeName.includes(".")) {
    return typeName;
  }
  return `${pkg}.${typeName}`;
}

function inferModuleName(pkg) {
  const parts = pkg.split(".");
  if (parts.length >= 2 && parts[0] === "ault") {
    return parts[1];
  }
  const versionIndex = parts.findIndex((part) => /^v\d/.test(part));
  if (versionIndex > 0) {
    return parts[versionIndex - 1];
  }
  return parts[parts.length - 1];
}

function snakeToCamel(value) {
  return value.replace(/_([a-z0-9])/g, (_, next) => String(next).toUpperCase());
}

function lowerFirst(value) {
  if (!value) return value;
  return value[0].toLowerCase() + value.slice(1);
}

function toPascalCase(input) {
  return input
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function protoFileToTsFile(protoFile) {
  const relative = path.relative(PROTO_BASE, protoFile);
  const tsPath = path.join(REPO_ROOT, "src/proto/gen", relative).replace(/\.proto$/, ".ts");
  return tsPath;
}

function toImportPath(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, "/");
  if (!rel.startsWith(".")) {
    rel = `./${rel}`;
  }
  return rel.replace(/\.ts$/, "");
}

function isScalarType(typeName) {
  return (
    SCALAR_STRING_TYPES.has(typeName) ||
    SCALAR_BYTES_TYPES.has(typeName) ||
    SCALAR_BOOL_TYPES.has(typeName) ||
    SCALAR_INT32_TYPES.has(typeName) ||
    SCALAR_UINT32_TYPES.has(typeName) ||
    SCALAR_INT64_TYPES.has(typeName) ||
    SCALAR_UINT64_TYPES.has(typeName) ||
    SCALAR_FLOAT_TYPES.has(typeName) ||
    SCALAR_DURATION_TYPES.has(typeName) ||
    SCALAR_TIMESTAMP_TYPES.has(typeName)
  );
}

function messageNeedsDefaults(messageDef) {
  return messageDef.name === "Params";
}

function mapFieldType(field, pkg, messageMap, durationFields, nestedTypes, stack) {
  if (REGISTRY_DURATION_TYPES.has(field.type)) {
    durationFields.add(field.name);
    return field.repeated ? "string[]" : "string";
  }

  if (REGISTRY_BOOL_TYPES.has(field.type)) {
    return field.repeated ? "bool[]" : "bool";
  }

  if (REGISTRY_STRING_TYPES.has(field.type)) {
    return field.repeated ? "string[]" : "string";
  }

  const resolvedType = resolveTypeName(field.type, pkg);
  const nestedDef = messageMap.get(resolvedType);
  if (!nestedDef) {
    throw new Error(`Missing message definition for type ${resolvedType}`);
  }

  if (stack.has(resolvedType)) {
    return field.repeated ? "NESTED[]" : "NESTED";
  }

  stack.add(resolvedType);
  const nestedFields = buildFields(nestedDef, messageMap, nestedTypes, durationFields, stack);
  stack.delete(resolvedType);

  const existing = nestedTypes[field.name];
  if (existing) {
    const existingJson = JSON.stringify(existing);
    const nestedJson = JSON.stringify(nestedFields);
    if (existingJson !== nestedJson) {
      throw new Error(
        `Nested field collision for '${field.name}'. Existing: ${existingJson}, new: ${nestedJson}`,
      );
    }
  } else {
    nestedTypes[field.name] = nestedFields;
  }

  return field.repeated ? "NESTED[]" : "NESTED";
}

function buildFields(messageDef, messageMap, nestedTypes, durationFields, stack) {
  const fields = messageDef.fields.map((field) => ({
    name: field.name,
    type: mapFieldType(field, messageDef.package, messageMap, durationFields, nestedTypes, stack),
  }));

  fields.sort((a, b) => b.name.localeCompare(a.name));
  return fields;
}

function mapFunctionName(fullName) {
  return `map${toPascalCase(fullName)}`;
}

function countMessageNames(requestTypes, messageMap) {
  const counts = new Map();
  for (const requestType of requestTypes) {
    const messageDef = messageMap.get(requestType);
    if (!messageDef) {
      throw new Error(`Missing message definition for request type ${requestType}`);
    }
    counts.set(messageDef.name, (counts.get(messageDef.name) ?? 0) + 1);
  }
  return counts;
}

function getImportName(messageDef, nameCounts) {
  const count = nameCounts.get(messageDef.name) ?? 0;
  if (count <= 1) {
    return messageDef.name;
  }
  const suffix = toPascalCase(messageDef.package);
  return `${messageDef.name}${suffix}`;
}

function getFieldDefaultOverride(fullName, camelName) {
  return FIELD_DEFAULT_OVERRIDES.get(`${fullName}.${camelName}`);
}

async function loadProtoDefinitions() {
  const files = await listProtoFiles(PROTO_ROOT);
  const messageMap = new Map();
  const aminoMap = new Map();
  const requestTypes = new Set();

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const text = stripComments(raw);
    const pkgMatch = text.match(/\bpackage\s+([A-Za-z0-9_.]+)\s*;/);
    if (!pkgMatch) {
      continue;
    }
    const pkg = pkgMatch[1];

    for (const { name, body } of extractMessageBlocks(text)) {
      const fullName = `${pkg}.${name}`;
      const fields = parseMessageBody(body);
      messageMap.set(fullName, { name, package: pkg, fields, filePath: file });

      const aminoMatch = body.match(/option\s+\(amino\.name\)\s*=\s*"([^"]+)"/);
      if (aminoMatch) {
        aminoMap.set(fullName, aminoMatch[1]);
      }
    }

    const rpcRegex = /rpc\s+\w+\s*\(\s*([.A-Za-z0-9_]+)\s*\)\s*returns\s*\(\s*([.A-Za-z0-9_]+)\s*\)/g;
    let rpcMatch;
    while ((rpcMatch = rpcRegex.exec(text))) {
      const requestType = rpcMatch[1];
      const resolved = resolveTypeName(requestType, pkg);
      const parts = resolved.split(".");
      const messageName = parts.length > 0 ? parts[parts.length - 1] : "";
      if (!messageName.startsWith("Msg")) {
        continue;
      }
      requestTypes.add(resolved);
    }
  }

  return { messageMap, aminoMap, requestTypes };
}

function collectNestedTypes(requestTypes, messageMap) {
  const needed = new Set();
  const queue = [...requestTypes];

  while (queue.length > 0) {
    const typeName = queue.shift();
    if (!typeName || needed.has(typeName)) {
      continue;
    }
    needed.add(typeName);

    const messageDef = messageMap.get(typeName);
    if (!messageDef) {
      throw new Error(`Missing message definition for type ${typeName}`);
    }

    for (const field of messageDef.fields) {
      if (isScalarType(field.type)) {
        continue;
      }
      const resolved = resolveTypeName(field.type, messageDef.package);
      if (!needed.has(resolved)) {
        queue.push(resolved);
      }
    }
  }

  return needed;
}

function generateRegistry({ messageMap, aminoMap, requestTypes }) {
  const entries = [];
  for (const requestType of requestTypes) {
    const messageDef = messageMap.get(requestType);
    if (!messageDef) {
      throw new Error(`Missing message definition for request type ${requestType}`);
    }
    const nestedTypes = {};
    const durationFields = new Set();
    const stack = new Set([requestType]);
    const valueFields = buildFields(messageDef, messageMap, nestedTypes, durationFields, stack);

    const typeUrl = `/${requestType}`;
    const aminoType =
      aminoMap.get(requestType) ?? `${inferModuleName(messageDef.package)}/${messageDef.name}`;

    const entry = {
      aminoType,
      eip712TypeName: `Type${messageDef.name}`,
      valueFields,
      ...(Object.keys(nestedTypes).length > 0 ? { nestedTypes } : {}),
      ...(durationFields.size > 0
        ? { durationFields: Array.from(durationFields).sort((a, b) => a.localeCompare(b)) }
        : {}),
      ...REGISTRY_OVERRIDES[typeUrl],
    };

    entries.push([typeUrl, entry]);
  }

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  const lines = [];
  lines.push("// Code generated by scripts/generate-eip712-registry.mjs. DO NOT EDIT.");
  lines.push('import type { Eip712MsgTypeConfig } from "./registry";');
  lines.push("");
  lines.push("export const EIP712_MSG_TYPES: Record<string, Eip712MsgTypeConfig> = {");

  for (const [typeUrl, entry] of entries) {
    lines.push(`  \"${typeUrl}\": {`);
    lines.push(`    aminoType: \"${entry.aminoType}\",`);
    lines.push(`    eip712TypeName: \"${entry.eip712TypeName}\",`);

    lines.push("    valueFields: [");
    for (const field of entry.valueFields) {
      lines.push(`      { name: \"${field.name}\", type: \"${field.type}\" },`);
    }
    lines.push("    ],");

    if (entry.nestedTypes) {
      lines.push("    nestedTypes: {");
      const nestedKeys = Object.keys(entry.nestedTypes).sort((a, b) => a.localeCompare(b));
      for (const key of nestedKeys) {
        lines.push(`      ${key}: [`);
        for (const field of entry.nestedTypes[key]) {
          lines.push(`        { name: \"${field.name}\", type: \"${field.type}\" },`);
        }
        lines.push("      ],");
      }
      lines.push("    },");
    }

    if (entry.durationFields) {
      lines.push("    durationFields: [");
      for (const fieldName of entry.durationFields) {
        lines.push(`      \"${fieldName}\",`);
      }
      lines.push("    ],");
    }

    if (entry.legacyAminoRegistered !== undefined) {
      lines.push(`    legacyAminoRegistered: ${entry.legacyAminoRegistered},`);
    }

    lines.push("  },");
  }

  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

function generateMsgBuilders({ messageMap, requestTypes, nameCounts }) {
  const moduleMap = new Map();
  const imports = new Map();
  const unionEntries = [];

  for (const requestType of requestTypes) {
    const messageDef = messageMap.get(requestType);
    if (!messageDef) {
      throw new Error(`Missing message definition for request type ${requestType}`);
    }

    const moduleName = inferModuleName(messageDef.package);
    const methodName = lowerFirst(messageDef.name.startsWith("Msg") ? messageDef.name.slice(3) : messageDef.name);
    const importName = getImportName(messageDef, nameCounts);
    const entries = moduleMap.get(moduleName) ?? [];
    entries.push({
      methodName,
      typeUrl: `/${requestType}`,
      messageName: importName,
      fullName: requestType,
      filePath: messageDef.filePath,
    });
    moduleMap.set(moduleName, entries);
    unionEntries.push({ typeUrl: `/${requestType}`, messageName: importName });

    const tsFile = protoFileToTsFile(messageDef.filePath);
    const importPath = toImportPath(OUTPUT_MSG_BUILDERS_PATH, tsFile);
    const names = imports.get(importPath) ?? new Map();
    names.set(messageDef.name, importName);
    imports.set(importPath, names);
  }

  const lines = [];
  lines.push("// Code generated by scripts/generate-eip712-registry.mjs. DO NOT EDIT.");
  lines.push('import type { Eip712Msg } from "./builder";');

  const importEntries = [...imports.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [importPath, names] of importEntries) {
    const specifiers = [...names.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([originalName, importName]) =>
        originalName === importName ? originalName : `${originalName} as ${importName}`,
      );
    lines.push(`import type { ${specifiers.join(", ")} } from \"${importPath}\";`);
  }

  lines.push("");
  lines.push(
    "const buildMsg = <TTypeUrl extends string, TValue>(typeUrl: TTypeUrl, value: TValue): Eip712Msg<TValue, TTypeUrl> => ({",
  );
  lines.push("  typeUrl,");
  lines.push("  value,");
  lines.push("});");
  lines.push("");
  lines.push("export const msg = {");

  const moduleEntries = [...moduleMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [moduleName, entries] of moduleEntries) {
    lines.push(`  ${moduleName}: {`);
    entries.sort((a, b) => a.methodName.localeCompare(b.methodName));
    for (const entry of entries) {
      lines.push(`    ${entry.methodName}: (value: ${entry.messageName}) => buildMsg(\"${entry.typeUrl}\", value),`);
    }
    lines.push("  },");
  }

  lines.push("} as const;");
  lines.push("");
  const sortedUnionEntries = [...unionEntries].sort((a, b) => a.typeUrl.localeCompare(b.typeUrl));
  if (sortedUnionEntries.length === 0) {
    lines.push("export type AnyEip712Msg = never;");
  } else {
    lines.push("export type AnyEip712Msg =");
    for (const entry of sortedUnionEntries) {
      lines.push(`  | Eip712Msg<${entry.messageName}, \"${entry.typeUrl}\">`);
    }
    lines.push(";");
  }
  lines.push("");

  return lines.join("\n");
}

function generateMsgEncoders({ messageMap, requestTypes, nameCounts }) {
  const nestedTypes = collectNestedTypes(requestTypes, messageMap);
  const mapFunctions = [];
  const helperUsage = new Set(["asRecord", "getField"]);

  function markHelper(name) {
    helperUsage.add(name);
  }

  function fieldExpr(field, messageDef, labelExpr) {
    const camelName = snakeToCamel(field.name);
    const rawExpr = `getField(record, \"${camelName}\", \"${field.name}\")`;
    const needsDefaults = messageNeedsDefaults(messageDef) || getFieldDefaultOverride(messageDef.fullName, camelName) !== undefined;

    if (SCALAR_STRING_TYPES.has(field.type)) {
      if (field.repeated) {
        const helper = needsDefaults ? "requireStringArrayOrDefault" : "requireStringArray";
        markHelper(helper);
        return `${helper}(${rawExpr}, ${labelExpr})`;
      }
      const helper = needsDefaults ? "requireStringOrDefault" : "requireString";
      markHelper(helper);
      return `${helper}(${rawExpr}, ${labelExpr})`;
    }

    if (SCALAR_BYTES_TYPES.has(field.type)) {
      if (field.repeated) {
        const helper = needsDefaults ? "requireBytesArrayOrDefault" : "requireBytesArray";
        markHelper(helper);
        return `${helper}(${rawExpr}, ${labelExpr})`;
      }
      const helper = needsDefaults ? "requireBytesOrDefault" : "requireBytes";
      markHelper(helper);
      return `${helper}(${rawExpr}, ${labelExpr})`;
    }

    if (SCALAR_BOOL_TYPES.has(field.type)) {
      if (field.repeated) {
        const helper = needsDefaults ? "requireBoolArrayOrDefault" : "requireBoolArray";
        markHelper(helper);
        return `${helper}(${rawExpr}, ${labelExpr})`;
      }
      const helper = needsDefaults ? "requireBoolOrDefault" : "requireBool";
      markHelper(helper);
      return `${helper}(${rawExpr}, ${labelExpr})`;
    }

    if (SCALAR_INT32_TYPES.has(field.type)) {
      if (field.repeated) {
        const helper = needsDefaults ? "requireInt32ArrayOrDefault" : "requireInt32Array";
        markHelper(helper);
        return `${helper}(${rawExpr}, ${labelExpr})`;
      }
      const helper = needsDefaults ? "requireInt32OrDefault" : "requireInt32Like";
      markHelper(helper);
      return `${helper}(${rawExpr}, ${labelExpr})`;
    }

    if (SCALAR_UINT32_TYPES.has(field.type)) {
      if (field.repeated) {
        const helper = needsDefaults ? "requireUint32ArrayOrDefault" : "requireUint32Array";
        markHelper(helper);
        return `${helper}(${rawExpr}, ${labelExpr})`;
      }
      const helper = needsDefaults ? "requireUint32OrDefault" : "requireUint32Like";
      markHelper(helper);
      return `${helper}(${rawExpr}, ${labelExpr})`;
    }

    if (SCALAR_INT64_TYPES.has(field.type) || SCALAR_UINT64_TYPES.has(field.type)) {
      if (field.repeated) {
        const helper = needsDefaults ? "requireBigIntArrayOrDefault" : "requireBigIntArray";
        markHelper(helper);
        return `${helper}(${rawExpr}, ${labelExpr})`;
      }
      const helper = needsDefaults ? "requireBigIntOrDefault" : "requireBigIntLike";
      markHelper(helper);
      return `${helper}(${rawExpr}, ${labelExpr})`;
    }

    if (SCALAR_FLOAT_TYPES.has(field.type)) {
      if (field.repeated) {
        const helper = needsDefaults ? "requireNumberArrayOrDefault" : "requireNumberArray";
        markHelper(helper);
        return `${helper}(${rawExpr}, ${labelExpr})`;
      }
      const helper = needsDefaults ? "requireNumberOrDefault" : "requireNumberLike";
      markHelper(helper);
      return `${helper}(${rawExpr}, ${labelExpr})`;
    }

    if (SCALAR_DURATION_TYPES.has(field.type)) {
      const helper = needsDefaults ? "requireDurationOrDefault" : "requireDuration";
      markHelper(helper);
      return `${helper}(${rawExpr}, ${labelExpr})`;
    }

    if (SCALAR_TIMESTAMP_TYPES.has(field.type)) {
      const helper = needsDefaults ? "requireTimestampOrDefault" : "requireTimestamp";
      markHelper(helper);
      return `${helper}(${rawExpr}, ${labelExpr})`;
    }

    const resolved = resolveTypeName(field.type, messageDef.package);
    const nestedFn = mapFunctionName(resolved);
    if (field.repeated) {
      markHelper("requireRecordArray");
      return `requireRecordArray(${rawExpr}, ${labelExpr}).map((item, index) => ${nestedFn}(item, \`${labelExpr.slice(1, -1)}[\${index}]\`))`;
    }

    markHelper("asRecord");
    return `${nestedFn}(asRecord(${rawExpr}), ${labelExpr})`;
  }

  const typeEntries = [...nestedTypes].sort((a, b) => a.localeCompare(b));

  for (const fullName of typeEntries) {
    const messageDef = messageMap.get(fullName);
    if (!messageDef) {
      throw new Error(`Missing message definition for type ${String(fullName)}`);
    }

    messageDef.fullName = fullName;

    const fnName = mapFunctionName(fullName);
    const fields = messageDef.fields;

    const lines = [];
    lines.push(`function ${fnName}(input: unknown, label: string = \"value\") {`);
    lines.push("  const record = asRecord(input);");
    lines.push("  const prefix = label ? `${label}.` : \"\";");
    lines.push("  return {");

    for (const field of fields) {
      const camelName = snakeToCamel(field.name);
      const labelExpr = `\`${"${prefix}"}${camelName}\``;
      const valueExpr = fieldExpr(field, messageDef, labelExpr);
      lines.push(`    ${camelName}: ${valueExpr},`);
    }

    lines.push("  };");
    lines.push("}");
    lines.push("");
    mapFunctions.push(lines.join("\n"));
  }

  const encoderImports = new Map();
  const encoderEntries = [];
  const sortedRequestTypes = [...requestTypes].sort((a, b) => a.localeCompare(b));

  for (const requestType of sortedRequestTypes) {
    const messageDef = messageMap.get(requestType);
    if (!messageDef) {
      throw new Error(`Missing message definition for request type ${requestType}`);
    }
    const tsFile = protoFileToTsFile(messageDef.filePath);
    const importPath = toImportPath(OUTPUT_MSG_ENCODERS_PATH, tsFile);
    const importName = getImportName(messageDef, nameCounts);
    const names = encoderImports.get(importPath) ?? new Map();
    names.set(messageDef.name, importName);
    encoderImports.set(importPath, names);

    encoderEntries.push({
      typeUrl: `/${requestType}`,
      messageName: importName,
      mapFn: mapFunctionName(requestType),
    });
  }

  const helperLines = [];

  const helperOrder = [
    "asRecord",
    "getField",
    "requireString",
    "requireStringOrDefault",
    "requireBytes",
    "requireBytesOrDefault",
    "requireBool",
    "requireBoolOrDefault",
    "requireNumberLike",
    "requireNumberOrDefault",
    "requireBigIntLike",
    "requireBigIntOrDefault",
    "requireInt32Like",
    "requireInt32OrDefault",
    "requireUint32Like",
    "requireUint32OrDefault",
    "requireArray",
    "requireArrayOrDefault",
    "requireStringArray",
    "requireStringArrayOrDefault",
    "requireBytesArray",
    "requireBytesArrayOrDefault",
    "requireBoolArray",
    "requireBoolArrayOrDefault",
    "requireNumberArray",
    "requireNumberArrayOrDefault",
    "requireBigIntArray",
    "requireBigIntArrayOrDefault",
    "requireInt32Array",
    "requireInt32ArrayOrDefault",
    "requireUint32Array",
    "requireUint32ArrayOrDefault",
    "requireRecordArray",
    "requireDuration",
    "requireDurationOrDefault",
    "requireTimestamp",
    "requireTimestampOrDefault",
  ];

  const helperTemplates = {
    asRecord: `const EMPTY_RECORD: Record<string, unknown> = {};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === \"object\" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return EMPTY_RECORD;
}`,
    getField: `function getField(record: Record<string, unknown>, camel: string, snake: string): unknown {
  if (record[camel] !== undefined) {
    return record[camel];
  }
  return record[snake];
}`,
    requireString: `function requireString(value: unknown, label: string): string {
  if (typeof value !== \"string\") {
    throw new Error(\`${"${label}"} must be a string.\`);
  }
  return value;
}`,
    requireStringOrDefault: `function requireStringOrDefault(value: unknown, label: string, defaultValue = \"\"): string {
  if (value === undefined) {
    return defaultValue;
  }
  return requireString(value, label);
}`,
    requireBytes: `function requireBytes(value: unknown, label: string): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (typeof value === \"string\") {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
      throw new Error(\`${"${label}"} must be a Uint8Array or valid base64 string.\`);
    }
    return base64ToBytes(value);
  }
  throw new Error(\`${"${label}"} must be a Uint8Array or base64 string.\`);
}`,
    requireBytesOrDefault: `function requireBytesOrDefault(value: unknown, label: string, defaultValue = new Uint8Array()): Uint8Array {
  if (value === undefined) {
    return defaultValue;
  }
  return requireBytes(value, label);
}`,
    requireBool: `function requireBool(value: unknown, label: string): boolean {
  if (typeof value !== \"boolean\") {
    throw new Error(\`${"${label}"} must be a boolean.\`);
  }
  return value;
}`,
    requireBoolOrDefault: `function requireBoolOrDefault(value: unknown, label: string, defaultValue = false): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return requireBool(value, label);
}`,
    requireNumberLike: `function requireNumberLike(value: unknown, label: string): number {
  if (typeof value === \"number\" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === \"bigint\") {
    return Number(value);
  }
  if (typeof value === \"string\" && value.trim() !== \"\") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  throw new Error(\`${"${label}"} must be a number.\`);
}`,
    requireNumberOrDefault: `function requireNumberOrDefault(value: unknown, label: string, defaultValue = 0): number {
  if (value === undefined) {
    return defaultValue;
  }
  return requireNumberLike(value, label);
}`,
    requireBigIntLike: `function requireBigIntLike(value: unknown, label: string): bigint {
  if (typeof value === \"bigint\") {
    return value;
  }
  if (typeof value === \"number\" && Number.isFinite(value)) {
    if (!Number.isInteger(value)) {
      throw new Error(\`${"${label}"} must be an integer.\`);
    }
    if (!Number.isSafeInteger(value)) {
      throw new Error(\`${"${label}"} exceeds safe integer range; use bigint or string.\`);
    }
    return BigInt(value);
  }
  if (typeof value === \"string\" && value.trim() !== \"\") {
    return BigInt(value);
  }
  throw new Error(\`${"${label}"} must be a bigint or decimal string.\`);
}`,
    requireBigIntOrDefault: `function requireBigIntOrDefault(value: unknown, label: string, defaultValue = 0n): bigint {
  if (value === undefined) {
    return defaultValue;
  }
  return requireBigIntLike(value, label);
}`,
    requireInt32Like: `function requireInt32Like(value: unknown, label: string): number {
  const num = requireNumberLike(value, label);
  if (!Number.isInteger(num) || num < -2147483648 || num > 2147483647) {
    throw new Error(\`${"${label}"} must be an int32.\`);
  }
  return num;
}`,
    requireInt32OrDefault: `function requireInt32OrDefault(value: unknown, label: string, defaultValue = 0): number {
  if (value === undefined) {
    return defaultValue;
  }
  return requireInt32Like(value, label);
}`,
    requireUint32Like: `function requireUint32Like(value: unknown, label: string): number {
  const num = requireNumberLike(value, label);
  if (!Number.isInteger(num) || num < 0 || num > 0xffffffff) {
    throw new Error(\`${"${label}"} must be a uint32.\`);
  }
  return num;
}`,
    requireUint32OrDefault: `function requireUint32OrDefault(value: unknown, label: string, defaultValue = 0): number {
  if (value === undefined) {
    return defaultValue;
  }
  return requireUint32Like(value, label);
}`,
    requireArray: `function requireArray<T>(value: unknown, label: string, mapper: (item: unknown, label: string) => T): T[] {
  if (!Array.isArray(value)) {
    throw new Error(\`${"${label}"} must be an array.\`);
  }
  return value.map((item, index) => mapper(item, \`${"${label}"}[\${index}]\`));
}`,
    requireArrayOrDefault: `function requireArrayOrDefault<T>(value: unknown, label: string, mapper: (item: unknown, label: string) => T, defaultValue: T[] = []): T[] {
  if (value === undefined) {
    return defaultValue;
  }
  return requireArray(value, label, mapper);
}`,
    requireStringArray: `function requireStringArray(value: unknown, label: string): string[] {
  return requireArray(value, label, requireString);
}`,
    requireStringArrayOrDefault: `function requireStringArrayOrDefault(value: unknown, label: string, defaultValue: string[] = []): string[] {
  return requireArrayOrDefault(value, label, requireString, defaultValue);
}`,
    requireBytesArray: `function requireBytesArray(value: unknown, label: string): Uint8Array[] {
  return requireArray(value, label, requireBytes);
}`,
    requireBytesArrayOrDefault: `function requireBytesArrayOrDefault(value: unknown, label: string, defaultValue: Uint8Array[] = []): Uint8Array[] {
  return requireArrayOrDefault(value, label, requireBytes, defaultValue);
}`,
    requireBoolArray: `function requireBoolArray(value: unknown, label: string): boolean[] {
  return requireArray(value, label, requireBool);
}`,
    requireBoolArrayOrDefault: `function requireBoolArrayOrDefault(value: unknown, label: string, defaultValue: boolean[] = []): boolean[] {
  return requireArrayOrDefault(value, label, requireBool, defaultValue);
}`,
    requireNumberArray: `function requireNumberArray(value: unknown, label: string): number[] {
  return requireArray(value, label, requireNumberLike);
}`,
    requireNumberArrayOrDefault: `function requireNumberArrayOrDefault(value: unknown, label: string, defaultValue: number[] = []): number[] {
  return requireArrayOrDefault(value, label, requireNumberLike, defaultValue);
}`,
    requireBigIntArray: `function requireBigIntArray(value: unknown, label: string): bigint[] {
  return requireArray(value, label, requireBigIntLike);
}`,
    requireBigIntArrayOrDefault: `function requireBigIntArrayOrDefault(value: unknown, label: string, defaultValue: bigint[] = []): bigint[] {
  return requireArrayOrDefault(value, label, requireBigIntLike, defaultValue);
}`,
    requireInt32Array: `function requireInt32Array(value: unknown, label: string): number[] {
  return requireArray(value, label, requireInt32Like);
}`,
    requireInt32ArrayOrDefault: `function requireInt32ArrayOrDefault(value: unknown, label: string, defaultValue: number[] = []): number[] {
  return requireArrayOrDefault(value, label, requireInt32Like, defaultValue);
}`,
    requireUint32Array: `function requireUint32Array(value: unknown, label: string): number[] {
  return requireArray(value, label, requireUint32Like);
}`,
    requireUint32ArrayOrDefault: `function requireUint32ArrayOrDefault(value: unknown, label: string, defaultValue: number[] = []): number[] {
  return requireArrayOrDefault(value, label, requireUint32Like, defaultValue);
}`,
    requireRecordArray: `function requireRecordArray(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error(\`${"${label}"} must be an array of objects.\`);
  }
  return value.map((item, index) => {
    if (!item || typeof item !== \"object\" || Array.isArray(item)) {
      throw new Error(\`${"${label}"}[\${index}] must be an object.\`);
    }
    return item as Record<string, unknown>;
  });
}`,
    requireDuration: `function requireDuration(value: unknown, label: string): { seconds: bigint; nanos: number } {
  if (!value || typeof value !== \"object\" || Array.isArray(value)) {
    throw new Error(\`${"${label}"} must be a protobuf Duration object.\`);
  }
  const record = asRecord(value);
  if (record.seconds === undefined && record.nanos === undefined) {
    throw new Error(\`${"${label}"} must include seconds or nanos.\`);
  }
  const seconds = requireBigIntLike(record.seconds ?? 0n, \`${"${label}"}.seconds\`);
  const nanos = requireInt32Like(record.nanos ?? 0, \`${"${label}"}.nanos\`);
  if (nanos < -999999999 || nanos > 999999999) {
    throw new Error(\`${"${label}"}.nanos must be between -999999999 and 999999999.\`);
  }
  if (seconds > 0n && nanos < 0) {
    throw new Error(\`${"${label}"}.nanos must be >= 0 when seconds is positive.\`);
  }
  if (seconds < 0n && nanos > 0) {
    throw new Error(\`${"${label}"}.nanos must be <= 0 when seconds is negative.\`);
  }
  return { seconds, nanos };
}`,
    requireDurationOrDefault: `function requireDurationOrDefault(value: unknown, label: string, defaultValue: { seconds: bigint; nanos: number } = { seconds: 0n, nanos: 0 }): { seconds: bigint; nanos: number } {
  if (value === undefined) {
    return defaultValue;
  }
  return requireDuration(value, label);
}`,
    requireTimestamp: `function requireTimestamp(value: unknown, label: string): { seconds: bigint; nanos: number } {
  const record = asRecord(value);
  const seconds = requireBigIntLike(record.seconds ?? 0n, \`${"${label}"}.seconds\`);
  const nanos = requireNumberLike(record.nanos ?? 0, \`${"${label}"}.nanos\`);
  return { seconds, nanos };
}`,
    requireTimestampOrDefault: `function requireTimestampOrDefault(value: unknown, label: string, defaultValue: { seconds: bigint; nanos: number } = { seconds: 0n, nanos: 0 }): { seconds: bigint; nanos: number } {
  if (value === undefined) {
    return defaultValue;
  }
  return requireTimestamp(value, label);
}`,
  };

  const helperDependencies = {
    requireStringOrDefault: ["requireString"],
    requireBytesOrDefault: ["requireBytes"],
    requireBoolOrDefault: ["requireBool"],
    requireNumberOrDefault: ["requireNumberLike"],
    requireBigIntOrDefault: ["requireBigIntLike"],
    requireInt32OrDefault: ["requireInt32Like"],
    requireInt32Like: ["requireNumberLike"],
    requireUint32OrDefault: ["requireUint32Like"],
    requireUint32Like: ["requireNumberLike"],
    requireArrayOrDefault: ["requireArray"],
    requireStringArray: ["requireArray", "requireString"],
    requireStringArrayOrDefault: ["requireArrayOrDefault", "requireString"],
    requireBytesArray: ["requireArray", "requireBytes"],
    requireBytesArrayOrDefault: ["requireArrayOrDefault", "requireBytes"],
    requireBoolArray: ["requireArray", "requireBool"],
    requireBoolArrayOrDefault: ["requireArrayOrDefault", "requireBool"],
    requireNumberArray: ["requireArray", "requireNumberLike"],
    requireNumberArrayOrDefault: ["requireArrayOrDefault", "requireNumberLike"],
    requireBigIntArray: ["requireArray", "requireBigIntLike"],
    requireBigIntArrayOrDefault: ["requireArrayOrDefault", "requireBigIntLike"],
    requireInt32Array: ["requireArray", "requireInt32Like"],
    requireInt32ArrayOrDefault: ["requireArrayOrDefault", "requireInt32Like"],
    requireUint32Array: ["requireArray", "requireUint32Like"],
    requireUint32ArrayOrDefault: ["requireArrayOrDefault", "requireUint32Like"],
    requireDuration: ["asRecord", "requireBigIntLike", "requireInt32Like"],
    requireDurationOrDefault: ["requireDuration"],
    requireTimestamp: ["asRecord", "requireBigIntLike", "requireNumberLike"],
    requireTimestampOrDefault: ["requireTimestamp"],
  };

  const expandedHelpers = new Set();

  function addHelper(name) {
    if (expandedHelpers.has(name)) return;
    expandedHelpers.add(name);
    const deps = helperDependencies[name];
    if (deps) {
      for (const dep of deps) {
        addHelper(dep);
      }
    }
  }

  for (const helper of helperUsage) {
    addHelper(helper);
  }

  for (const helper of helperOrder) {
    if (expandedHelpers.has(helper)) {
      helperLines.push(helperTemplates[helper]);
      helperLines.push("");
    }
  }

  const lines = [];
  lines.push("// Code generated by scripts/generate-eip712-registry.mjs. DO NOT EDIT.");

  const importEntries = [...encoderImports.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [importPath, names] of importEntries) {
    const specifiers = [...names.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([originalName, importName]) =>
        originalName === importName ? originalName : `${originalName} as ${importName}`,
      );
    lines.push(`import { ${specifiers.join(", ")} } from \"${importPath}\";`);
  }
  lines.push('import { base64ToBytes } from "../core/base64";');

  lines.push("");
  lines.push(...helperLines);
  lines.push(...mapFunctions);

  lines.push("export const MSG_ENCODERS: Record<string, (value: unknown) => Uint8Array> = {");
  for (const entry of encoderEntries) {
    lines.push(`  \"${entry.typeUrl}\": (value: unknown) =>`);
    lines.push(`    ${entry.messageName}.encode(${entry.messageName}.fromPartial(${entry.mapFn}(value))).finish(),`);
  }
  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const { messageMap, aminoMap, requestTypes } = await loadProtoDefinitions();
  const nameCounts = countMessageNames(requestTypes, messageMap);

  const registryOutput = generateRegistry({ messageMap, aminoMap, requestTypes });
  await fs.writeFile(OUTPUT_REGISTRY_PATH, registryOutput);

  const msgBuildersOutput = generateMsgBuilders({ messageMap, requestTypes, nameCounts });
  await fs.writeFile(OUTPUT_MSG_BUILDERS_PATH, msgBuildersOutput);

  const msgEncodersOutput = generateMsgEncoders({ messageMap, requestTypes, nameCounts });
  await fs.writeFile(OUTPUT_MSG_ENCODERS_PATH, msgEncodersOutput);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
