import { anonymousModelRule } from "./rules/anonymous-model.js";
import { JSONSchemaType, createTypeSpecLibrary } from "@typespec/compiler";
import { emptyUnionRule } from "./rules/empty-union.js";
import { intrinsicTypeUnsupportedRule } from "./rules/intrinsic-type-unsupported.js";

export interface PydanticEmitterOptions {
  "output-file"?: string;
}

const PydanticEmitterOptionsSchema: JSONSchemaType<PydanticEmitterOptions> = {
  type: "object",
  additionalProperties: false,
  properties: {
    "output-file": { type: "string", nullable: true },
  },
  required: [],
};

const libName = "typespec-pydantic";

export const $lib = createTypeSpecLibrary({
  name: "typespec-pydantic",
  diagnostics: {
    "unexpected-error": {
      severity: "error",
      messages: {
        default: "An unexpected error occurred. Please file an issue.",
      },
    },
  },
  linter: {
    rules: [anonymousModelRule, emptyUnionRule, intrinsicTypeUnsupportedRule],
    ruleSets: {
      all: {
        enable: {
          [`${libName}/${anonymousModelRule.name}`]: true,
          [`${libName}/${emptyUnionRule.name}`]: true,
          [`${libName}/${intrinsicTypeUnsupportedRule.name}`]: true,
        },
      },
    },
  },
  emitter: {
    options: PydanticEmitterOptionsSchema,
  },
} as const);

// Optional but convenient, those are meant to be used locally in your library.
export const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;
