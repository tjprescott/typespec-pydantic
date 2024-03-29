import { Diagnostic, resolvePath } from "@typespec/compiler";
import { BasicTestRunner, createTestLibrary, resolveVirtualPath } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { fileURLToPath } from "url";

export const PythonTestLibrary = createTestLibrary({
  name: "typespec-python",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../.."),
});

export interface TestOutput {
  path: string;
  contents: string[];
}

export async function readFilesInDirRecursively(runner: BasicTestRunner, dir: string): Promise<string[]> {
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

export function getIndent(lines: string[]): number {
  for (const line of lines) {
    if (line.trim() !== "") {
      return line.length - line.trimStart().length;
    }
  }
  return 0;
}

/** Eliminates leading indentation and blank links that can mess with comparisons */
export function trimLines(lines: string[]): string[] {
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

export function checkImports(expected: Map<string, string[]>, lines: string[]) {
  const imports = new Map<string, string[]>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("from")) {
      const match = trimmed.match(/^from\s+([._\w]+)\s+import\s+(.*)$/);
      if (match !== null) {
        imports.set(match[1], match[2].split(","));
      }
    } else if (trimmed.startsWith("import")) {
      const match = trimmed.match(/^import\s+(.*)$/);
      if (match !== null) {
        imports.set(match[1], []);
      }
    } else if (line === "") {
      continue;
    } else {
      break;
    }
  }
  strictEqual(expected.size, imports.size);
  for (const [key, value] of expected.entries()) {
    const actual = imports.get(key);
    strictEqual(value.length, actual?.length);
    for (const item of value) {
      strictEqual(true, actual?.includes(item));
    }
  }
}

/** Compares an expected string to a subset of the actual output. */
export function compare(expect: string, actual: string[], ignoreImports: boolean = true) {
  // split the input into lines and ignore leading or trailing empty lines.
  const expectedLines = trimLines(expect.split("\n"));
  let actualLines = trimLines(actual);
  if (ignoreImports) {
    actualLines = actualLines.filter((line) => !line.startsWith("from"));
  }
  strictEqual(expectedLines.length, actualLines.length);
  for (let x = 0; x < actualLines.length; x++) {
    const expect = expectedLines[x];
    const actual = actualLines[x];
    strictEqual(
      expect,
      actual,
      `Actual differed from expected at line #${x + 1}\nACTUAL: '${actual}'\nEXPECTED: '${expect}'`,
    );
  }
}

export async function outputFor(
  runner: BasicTestRunner,
  emitterName: string,
  code: string,
): Promise<[TestOutput[], readonly Diagnostic[]]> {
  const outPath = resolveVirtualPath("/test.py");
  const [_, diagnostics] = await runner.compileAndDiagnose(code, {
    noEmit: false,
    emitters: { emitterName: { "output-file": outPath } },
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
