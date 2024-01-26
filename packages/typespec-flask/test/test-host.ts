import { createTestHost, createTestWrapper } from "@typespec/compiler/testing";
import { FlaskTestLibrary } from "../src/testing/index.js";
import { HttpTestLibrary } from "@typespec/http/testing";
import { outputFor } from "typespec-python/testing";

export async function createFlaskTestHost() {
  return createTestHost({
    libraries: [FlaskTestLibrary, HttpTestLibrary],
  });
}

export async function createFlaskTestRunner() {
  const host = await createFlaskTestHost();
  return createTestWrapper(host, {
    autoUsings: ["Flask"],
    compilerOptions: {
      emit: ["typespec-flask"],
    },
  });
}

export async function flaskOutputFor(input: string) {
  const runner = await createFlaskTestRunner();
  return await outputFor(runner, "typespec-flask", input);
}
