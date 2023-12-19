import samples from "../samples/dist/samples.js";

export const TypeSpecPlaygroundConfig = {
  defaultEmitter: "typespec-pydantic",
  libraries: ["@typespec/compiler", "typespec-pydantic"],
  samples,
} as const;
