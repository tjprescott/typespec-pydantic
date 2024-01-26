import { BasicTestRunner, createTestHost, createTestWrapper, resolveVirtualPath } from "@typespec/compiler/testing";
import { FlaskTestLibrary } from "../src/testing/index.js";
import { strictEqual } from "assert";
import { Diagnostic } from "@typespec/compiler";
import { HttpTestLibrary } from "@typespec/http/testing";

export interface TestOutput {
  path: string;
  contents: string[];
}

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

async function readFilesInDirRecursively(runner: BasicTestRunner, dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await runner.program.host.readDir(dir)) {
    if (entry.endsWith(".py")) {
      files.push(`${dir}/${entry}`);
    } else {
      files.push(...(await readFilesInDirRecursively(runner, `${dir}/${entry}`)));
    }
  }
  return files;
}

export async function flaskOutputFor(code: string): Promise<[TestOutput[], readonly Diagnostic[]]> {
  const runner = await createFlaskTestRunner();
  const outPath = resolveVirtualPath("/test.py");
  const [_, diagnostics] = await runner.compileAndDiagnose(code, {
    noEmit: false,
    emitters: { "typespec-flask": { "output-file": outPath } },
    miscOptions: { "disable-linter": true },
  });
  const emitterOutputDir = runner.program.emitters[0].emitterOutputDir;
  const results: TestOutput[] = [];
  if (runner.fs.get(outPath) === undefined) {
    const files = await readFilesInDirRecursively(runner, emitterOutputDir);
    for (const path of files) {
      const rawText = runner.fs.get(resolveVirtualPath(path));
      const lines = rawText ? rawText.split("\n") : [];
      results.push({ path: path, contents: lines });
    }
  } else {
    // return a single file
    const rawText = runner.fs.get(outPath);
    const lines = rawText ? rawText.split("\n") : [];
    results.push({ path: outPath, contents: lines });
  }
  return [results, diagnostics];
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
