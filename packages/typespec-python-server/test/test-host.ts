import { createTestHost, createTestWrapper, resolveVirtualPath } from "@typespec/compiler/testing";
import { PythonServerTestLibrary } from "../src/testing/index.js";
import { strictEqual } from "assert";
import { Diagnostic } from "@typespec/compiler";

export async function createPythonServerTestHost() {
  return createTestHost({
    libraries: [PythonServerTestLibrary],
  });
}

export async function createPythonServerTestRunner() {
  const host = await createPythonServerTestHost();
  return createTestWrapper(host, {
    autoUsings: ["Python.Server"],
    compilerOptions: {
      emit: ["typespec-pydantic"],
    },
  });
}

export async function pydanticOutputFor(code: string): Promise<[string[], readonly Diagnostic[]]> {
  const runner = await createPythonServerTestRunner();
  const outPath = resolveVirtualPath("/test.py");
  const [_, diagnostics] = await runner.compileAndDiagnose(code, {
    noEmit: false,
    emitters: { "typespec-pydantic": { "output-file": outPath } },
    miscOptions: { "disable-linter": true },
  });
  const rawText = runner.fs.get(outPath);
  return [rawText ? rawText.split("\n") : [], diagnostics];
}

function getIndent(lines: string[]): number {
  for (const line of lines) {
    if (line.trim() !== "") {
      return line.length - line.trimStart().length;
    }
  }
  return 0;
}

/** Eliminates leading indentation and blank links that can mess with comparisons */
function trimLines(lines: string[]): string[] {
  const trimmed: string[] = [];
  const indent = getIndent(lines);
  for (const line of lines) {
    if (line.trim() === "") {
      // skip blank lines
      continue;
    } else {
      // remove any leading indentation
      trimmed.push(line.substring(indent));
    }
  }
  return trimmed;
}

/** Compares an expected string to a subset of the actual output. */
export function compare(expect: string, lines: string[], ignoreImports: boolean = true) {
  // split the input into lines and ignore leading or trailing empty lines.
  const expectedLines = trimLines(expect.split("\n"));
  let checkLines = trimLines(lines);
  if (ignoreImports) {
    checkLines = checkLines.filter((line) => !line.startsWith("from"));
  }
  strictEqual(expectedLines.length, checkLines.length);
  for (let x = 0; x < checkLines.length; x++) {
    strictEqual(
      expectedLines[x],
      checkLines[x],
      `Actual differed from expected at line #${x + 1}\nACTUAL: '${checkLines[x]}'\nEXPECTED: '${expectedLines[x]}'`,
    );
  }
}
