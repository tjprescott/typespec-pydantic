import { JSONSchemaType, createTypeSpecLibrary, paramMessage } from "@typespec/compiler";

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

export const $lib = createTypeSpecLibrary({
  name: "typespec-pydantic",
  diagnostics: {
    "anonymous-model": {
      severity: "warning",
      messages: {
        default: "Anonymous models are not supported. Please extract your anonymous model into a named model.",
      }
    },
    "template-instantiation": {
      severity: "warning",
      messages: {
        default: "Template instantiation not supported. Please extract your instantiation to a named model using `is` syntax: (ex: `StringFoo is Template<string>`).",
      }
    },
    "array-declaration-unsupported": {
      severity: "warning",
      messages: {
        default: "Array declarations are not supported in Pydantic. Please use an alias instead.",
      }
    },
    "empty-union": {
      severity: "error",
      messages: {
        default: "Unions must have at least one variant.",
      }
    },
    "intrinsic-type-unsupported": {
      severity: "warning",
      messages: {
        default: paramMessage`Intrinsic type '${"name"}' not recognized. Assuming 'object'. Please file an issue.`,
        never: "Intrinsic type 'never' not supported in Pydantic. Property will be omitted.",
      }
    }
  },
  emitter: {
    options: PydanticEmitterOptionsSchema,
  },
} as const);

// Optional but convenient, those are meant to be used locally in your library.
export const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;