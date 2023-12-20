import { StringBuilder, code } from "@typespec/compiler/emitter-framework";

export class ImportManager {
  private imports = new Map<string, Set<string>>();

  add(module: string, name: string) {
    if (!this.imports.has(module)) {
      this.imports.set(module, new Set());
    }
    this.imports.get(module)?.add(name);
  }

  getImports(module: string): Set<string> | undefined {
    return this.imports.get(module);
  }

  emit(): string {
    const builder = new StringBuilder();
    for (const [moduleName, names] of this.imports.entries()) {
      builder.push(code`from ${moduleName} import ${[...names].join(", ")}\n`);
    }
    return builder.reduce() + "";
  }
}
