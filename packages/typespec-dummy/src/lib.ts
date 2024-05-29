import { JSONSchemaType, createTypeSpecLibrary } from "@typespec/compiler";

export interface DummyEmitterOptions {
  "output-file"?: string;
}

const DummyEmitterOptionsSchema: JSONSchemaType<DummyEmitterOptions> = {
  type: "object",
  additionalProperties: false,
  properties: {
    "output-file": { type: "string", nullable: true },
  },
  required: [],
};

const libName = "typespec-dummy";

export const $lib = createTypeSpecLibrary({
  name: "typespec-dummy",
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
        enable: {},
      },
    },
  },
  emitter: {
    options: DummyEmitterOptionsSchema,
  },
} as const);

// Optional but convenient, those are meant to be used locally in your library.
export const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;
