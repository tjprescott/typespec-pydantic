import { AssetEmitter, SourceFile } from "@typespec/compiler/emitter-framework";

interface ImportMetadata {
  kind: ImportKind;
  module: string;
  name: string;
}

/** The kind of import (regular or deferred) */
export enum ImportKind {
  /** A top-level module import */
  regular,
  /** A deferred import to avoid circular imports */
  deferred,
}

export class ImportManager {
  private imports = new Map<SourceFile<string>, Map<string, Set<ImportMetadata>>>();

  private emitter: AssetEmitter<string, Record<string, never>>;

  constructor(emitter: AssetEmitter<string, Record<string, never>>) {
    this.emitter = emitter;
  }

  get(sourceFile: SourceFile<string>, kind: ImportKind): Map<string, Set<ImportMetadata>> {
    const imports = new Map<string, Set<ImportMetadata>>();
    const fileImports = this.imports.get(sourceFile);
    if (fileImports === undefined) {
      return imports;
    }
    for (const [module, moduleImports] of fileImports) {
      const moduleSet = new Set<ImportMetadata>();
      for (const importMetadata of moduleImports) {
        if (importMetadata.kind === kind) {
          moduleSet.add(importMetadata);
        }
      }
      if (moduleSet.size > 0) {
        imports.set(module, moduleSet);
      }
    }
    return imports;
  }

  has(sourceFile: SourceFile<string>, module: string, name: string, kind: ImportKind): boolean {
    const fileImports = this.imports.get(sourceFile);
    if (fileImports === undefined) return false;
    const moduleImports = fileImports.get(module);
    if (moduleImports === undefined) return false;
    // if any moduleImport has a matching name and kind return true
    return Array.from(moduleImports).some(
      (importMetadata) => importMetadata.name === name && importMetadata.kind === kind,
    );
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
    const fileImports = this.imports.get(sourceFile) ?? new Map<string, Set<ImportMetadata>>();
    const moduleImports = fileImports.get(module) ?? new Set<ImportMetadata>();
    const metadata = { kind, module, name };
    const exists = Array.from(moduleImports).some(
      (importMetadata) => importMetadata.name === name && importMetadata.kind === kind,
    );
    if (!exists) {
      moduleImports.add(metadata);
    }
    fileImports.set(module, moduleImports);
    this.imports.set(sourceFile, fileImports);
  }

  #delete(sourceFile: SourceFile<string>, module: string, name: string, kind: ImportKind) {
    const fileImports = this.imports.get(sourceFile);
    if (fileImports === undefined) return;
    const moduleImports = fileImports.get(module);
    if (moduleImports === undefined) return;
    // remove the item form the set if name and kind match
    for (const importMetadata of moduleImports) {
      if (importMetadata.name === name && importMetadata.kind === kind) {
        moduleImports.delete(importMetadata);
        break;
      }
    }
    moduleImports.size === 0 && fileImports.delete(module);
  }
}
