import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { createPythonTestRunner } from "./test-host.js";

describe("typespec-python: core", () => {
  // describe("import path resolution", () => {
  //   it("should resolve a simple import path", async () => {
  //     const input = `
  //     model Foo {
  //       prop: string;
  //     };`;
  //     const runner = await createPythonTestRunner();
  //     const [result, diagnostics] = await runner.compileAndDiagnose(input);
  //     expectDiagnosticEmpty(diagnostics);
  //     const test = "best";
  //   });
  // });
});
