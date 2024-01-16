import { BasicTestRunner, createTestHost, createTestWrapper } from "@typespec/compiler/testing";
import { PythonTestLibrary } from "../src/testing/index.js";
import { strictEqual } from "assert";

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

export function checkImports(expected: Map<string, string[]>, lines: string[]) {
  const imports = new Map<string, string[]>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("from")) {
      const match = trimmed.match(/^from\s+(\w+)\s+import\s+(.*)$/);
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
