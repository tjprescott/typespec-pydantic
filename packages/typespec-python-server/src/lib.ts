import { JSONSchemaType, createTypeSpecLibrary, paramMessage } from "@typespec/compiler";

export interface PythonServerEmitterOptions {
  "model-emitter"?: string;
  "operation-emitter"?: string;
}

const PythonServerEmitterOptionsSchema: JSONSchemaType<PythonServerEmitterOptions> = {
  type: "object",
  additionalProperties: false,
  properties: {
    "model-emitter": { type: "string", nullable: true },
    "operation-emitter": { type: "string", nullable: true },
  },
  required: [],
};

const libName = "typespec-python-server";

export const $lib = createTypeSpecLibrary({
  name: libName,
  diagnostics: {
    "file-not-found": {
      severity: "error",
      messages: {
        default: paramMessage`File ${"path"} not found.`,
      },
    },
    "file-load": {
      severity: "error",
      messages: {
        default: paramMessage`${"message"}`,
      },
    },
    "invalid-emitter": {
      severity: "error",
      messages: {
        default: paramMessage`Requested emitter package ${"emitterPackage"} does not provide an "onEmit" function.`,
      },
    },
    "import-not-found": {
      severity: "error",
      messages: {
        default: paramMessage`Couldn't resolve import "${"path"}"`,
      },
    },
    "library-invalid": {
      severity: "error",
      messages: {
        tspMain: paramMessage`Library "${"path"}" has an invalid tspMain file.`,
        default: paramMessage`Library "${"path"}" has an invalid main file.`,
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
    options: PythonServerEmitterOptionsSchema,
  },
} as const);

// Optional but convenient, those are meant to be used locally in your library.
export const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;
