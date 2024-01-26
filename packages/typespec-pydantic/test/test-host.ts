import { createTestHost, createTestWrapper } from "@typespec/compiler/testing";
import { PydanticTestLibrary } from "../src/testing/index.js";
import { outputFor } from "typespec-python/testing";

export async function createPydanticTestHost() {
  return createTestHost({
    libraries: [PydanticTestLibrary],
  });
}

export async function createPydanticTestRunner() {
  const host = await createPydanticTestHost();
  return createTestWrapper(host, {
    autoUsings: ["Pydantic"],
    compilerOptions: {
      emit: ["typespec-pydantic"],
    },
  });
}

export async function pydanticOutputFor(input: string) {
  const runner = await createPydanticTestRunner();
  return await outputFor(runner, "typespec-pydantic", input);
}
