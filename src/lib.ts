import { JSONSchemaType, createTypeSpecLibrary } from "@typespec/compiler";

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
    }
  },
  emitter: {
    options: PydanticEmitterOptionsSchema,
  },
} as const);

// Optional but convenient, those are meant to be used locally in your library.
export const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;