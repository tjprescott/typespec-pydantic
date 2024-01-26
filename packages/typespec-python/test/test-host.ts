import { createTestHost, createTestWrapper } from "@typespec/compiler/testing";
import { PythonTestLibrary } from "../src/testing/index.js";

export async function createPythonTestHost() {
  return createTestHost({
    libraries: [PythonTestLibrary],
  });
}

export async function createPythonTestRunner() {
  const host = await createPythonTestHost();
  return createTestWrapper(host, {
    autoUsings: ["Python"],
    compilerOptions: {},
  });
}
