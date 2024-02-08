import { Declaration, SourceFile, StringBuilder } from "@typespec/compiler/emitter-framework";
import { GlobalNamespace, PythonPartialEmitter } from "./python.js";
import { Model, Namespace, Scalar } from "@typespec/compiler";

export enum DeclarationKind {
  Model,
  Operation,
}

/** Filters for retrieving declarations. Any defined properties are treated with AND logic. */
export interface DeclarationFilters {
  kind?: DeclarationKind;
  path?: string;
  rootPath?: string | typeof GlobalNamespace;
  sourceFile?: SourceFile<string>;
}

export interface DeclarationMetadata {
  name: string;
  kind: DeclarationKind;
  /** The import path to use when the declaration is in a TypeSpec namespace, or a sentinel that the declaration is in the global namespace. */
  importPath: string | typeof GlobalNamespace;
  decl?: Declaration<string>;
  omit: boolean;
  source?: Model | Scalar;
  sourceFile?: SourceFile<string> | undefined;
  /** The import path to use if the declaration is in the global namespace */
  globalImportPath: string;
}

export interface DeclarationOptions {
  name: string;
  namespace: Namespace | undefined;
  kind: DeclarationKind;
  value?: string | StringBuilder;
  omit: boolean;
  sourceFile?: SourceFile<string>;
  /** The import path to use if the declaration is in the global namespace */
  globalImportPath: string;
}

export class DeclarationManager {
  private declarations = new Map<string | typeof GlobalNamespace, DeclarationMetadata>();

  declare(emitter: PythonPartialEmitter, options: DeclarationOptions): Declaration<string> {
    const sf = options.sourceFile ?? emitter.getSourceFile();
    const decl = emitter.declaration(options.name, options.value ?? "");
    decl.meta["omit"] = options.omit;
    const importPath = emitter.importPathForNamespace(options.namespace);
    const declarationKey = `${String(importPath)}.${options.name}`;
    this.declarations.set(declarationKey, {
      name: options.name,
      kind: options.kind,
      importPath: importPath,
      decl: decl,
      omit: options.omit,
      source: undefined,
      sourceFile: sf,
      globalImportPath: options.globalImportPath,
    });
    return decl;
  }

  /** Returns true of the strings are equal, ignoring the last segment. Applies only to dot-separated strings. */
  #rootsAreEqual(p1: string, p2: string): boolean {
    let p1Root = p1.split(".").slice(0, -1).join(".");
    let p2Root = p2.split(".").slice(0, -1).join(".");
    p1Root = p1Root === "" ? String(GlobalNamespace) : p1Root;
    p2Root = p2Root === "" ? String(GlobalNamespace) : p2Root;
    return p1Root === p2Root;
  }

  get(opts: DeclarationFilters): DeclarationMetadata[] {
    const decls: DeclarationMetadata[] = [];
    for (const [key, val] of this.declarations.entries()) {
      // never return omitted declarations. These are needed only for the emitter framework.
      if (val.omit) continue;
      if (opts.kind !== undefined && val.kind !== opts.kind) continue;
      if (opts.path !== undefined && key !== opts.path) continue;
      if (opts.rootPath !== undefined && !this.#rootsAreEqual(String(key), String(opts.rootPath))) continue;
      if (opts.sourceFile !== undefined && val.sourceFile !== opts.sourceFile) continue;
      decls.push(val);
    }
    return decls;
  }

  has(key: string | typeof GlobalNamespace): boolean {
    return this.declarations.has(key);
  }
}
