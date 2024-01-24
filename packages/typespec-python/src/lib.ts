import { createTypeSpecLibrary } from "@typespec/compiler";

const libName = "typespec-python";

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
        enable: {},
      },
    },
  },
} as const);

// Optional but convenient, those are meant to be used locally in your library.
export const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;
