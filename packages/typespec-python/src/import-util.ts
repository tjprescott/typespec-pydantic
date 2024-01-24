import { AssetEmitter, SourceFile } from "@typespec/compiler/emitter-framework";

/** The kind of import (regular or deferred) */
export enum ImportKind {
  /** A top-level module import */
  regular,
  /** A deferred import to avoid circular imports */
  deferred,
}

export class ImportManager {
  private imports = new Map<SourceFile<string>, Map<string, Set<string>>>();

  private deferredImports = new Map<SourceFile<string>, Map<string, Set<string>>>();

  private emitter: AssetEmitter<string, Record<string, never>>;

  constructor(emitter: AssetEmitter<string, Record<string, never>>) {
    this.emitter = emitter;
  }

  getImports(sourceFile: SourceFile<string>, kind: ImportKind): Map<string, Set<string>> {
    const fileImports = kind === ImportKind.deferred ? this.deferredImports : this.imports;
    return fileImports.get(sourceFile) ?? new Map<string, Set<string>>();
  }

  has(sourceFile: SourceFile<string>, module: string, name: string, kind: ImportKind): boolean {
    const fileImports =
      kind === ImportKind.deferred ? this.deferredImports.get(sourceFile) : this.imports.get(sourceFile);
    if (fileImports === undefined) return false;
    const moduleImports = fileImports.get(module);
    if (moduleImports === undefined) return false;
    return moduleImports.has(name);
  }

  add(module: string, name: string, kind: ImportKind = ImportKind.regular, sourceFile?: SourceFile<string>) {
    // strip double quotes from the name, if present
    name = name.replace(/^"(.*)"$/, "$1");
    if (sourceFile === undefined) {
      const context = this.emitter.getContext();
      if (context.scope.kind === "sourceFile") {
        sourceFile = context.scope.sourceFile;
      } else {
        throw new Error("Expected source file scope");
      }
    }
    if (sourceFile === undefined) {
      throw new Error("Expected source file");
    }

    if (kind === ImportKind.deferred && this.has(sourceFile, module, name, ImportKind.regular)) {
      this.#delete(sourceFile, module, name, ImportKind.regular);
    } else if (kind === ImportKind.regular && this.has(sourceFile, module, name, ImportKind.deferred)) {
      // if a deferred import exists we won't use a regular import
      return;
    }
    const fileImports =
      (kind === ImportKind.deferred ? this.deferredImports.get(sourceFile) : this.imports.get(sourceFile)) ??
      new Map<string, Set<string>>();
    const moduleImports = fileImports.get(module) ?? new Set<string>();
    moduleImports.add(name);
    fileImports.set(module, moduleImports);
    if (kind === ImportKind.deferred) {
      this.deferredImports.set(sourceFile, fileImports);
    } else {
      this.imports.set(sourceFile, fileImports);
    }
  }

  #delete(sourceFile: SourceFile<string>, module: string, name: string, kind: ImportKind) {
    const fileImports =
      kind === ImportKind.deferred ? this.deferredImports.get(sourceFile) : this.imports.get(sourceFile);
    if (fileImports === undefined) return;
    const moduleImports = fileImports.get(module);
    if (moduleImports === undefined) return;
    moduleImports.delete(name);
    moduleImports.size === 0 && fileImports.delete(module);
  }
}
