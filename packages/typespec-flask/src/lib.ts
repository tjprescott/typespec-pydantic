import { JSONSchemaType, createTypeSpecLibrary } from "@typespec/compiler";

export interface FlaskEmitterOptions {
  "output-file"?: string;
}

const FlaskEmitterOptionsSchema: JSONSchemaType<FlaskEmitterOptions> = {
  type: "object",
  additionalProperties: false,
  properties: {
    "output-file": { type: "string", nullable: true },
  },
  required: [],
};

const libName = "typespec-flask";

export const $lib = createTypeSpecLibrary({
  name: libName,
  diagnostics: {
    "unexpected-error": {
      severity: "error",
      messages: {
        default: "An unexpected error occurred. Please file an issue.",
      },
    },
  },
  linter: {
    rules: [],
    ruleSets: {
      all: {
        enable: {
          // [`${libName}/${anonymousModelRule.name}`]: true,
          // [`${libName}/${emptyUnionRule.name}`]: true,
          // [`${libName}/${intrinsicTypeUnsupportedRule.name}`]: true,
        },
      },
    },
  },
  emitter: {
    options: FlaskEmitterOptionsSchema,
  },
} as const);

// Optional but convenient, those are meant to be used locally in your library.
export const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;
