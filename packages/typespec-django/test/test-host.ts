import { createTestHost, createTestWrapper } from "@typespec/compiler/testing";
import { DjangoTestLibrary } from "../src/testing/index.js";
import { outputFor } from "typespec-python/testing";

export async function createDjangoTestHost() {
  return createTestHost({
    libraries: [DjangoTestLibrary],
  });
}

export async function createDjangoTestRunner() {
  const host = await createDjangoTestHost();
  return createTestWrapper(host, {
    autoUsings: ["Django"],
    compilerOptions: {
      emit: ["typespec-django"],
    },
  });
}

export async function djangoOutputFor(input: string) {
  const runner = await createDjangoTestRunner();
  return await outputFor(runner, "typespec-django", input);
}
