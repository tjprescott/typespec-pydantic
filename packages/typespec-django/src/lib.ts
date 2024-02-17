import { JSONSchemaType, createTypeSpecLibrary, paramMessage } from "@typespec/compiler";

export interface DjangoEmitterOptions {
  "output-file"?: string;
}

const DjangoEmitterOptionsSchema: JSONSchemaType<DjangoEmitterOptions> = {
  type: "object",
  additionalProperties: false,
  properties: {
    "output-file": { type: "string", nullable: true },
  },
  required: [],
};

const libName = "typespec-django";

export const $lib = createTypeSpecLibrary({
  name: libName,
  diagnostics: {
    "invalid-field-value": {
      severity: "error",
      messages: {
        default: paramMessage`Invalid field value '${"value"}' for '${"fieldName"}'.`,
      },
    },
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
      all: {},
    },
  },
  emitter: {
    options: DjangoEmitterOptionsSchema,
  },
} as const);

// Optional but convenient, those are meant to be used locally in your library.
export const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;
