import { Declaration, SourceFile, StringBuilder } from "@typespec/compiler/emitter-framework";
import { PythonPartialEmitter } from "./python.js";
import { Model, Namespace, Scalar } from "@typespec/compiler";

export enum DeclarationKind {
  Model,
  Operation,
}

export enum DeclarationDeferKind {
  NotDeferred,
  Deferred,
}

/** Filters for retrieving declarations. Any defined properties are treated with AND logic. */
export interface DeclarationFilters {
  kind?: DeclarationKind;
  defer?: DeclarationDeferKind;
  path?: string;
  sourceFile?: SourceFile<string>;
}

export interface DeclarationMetadata {
  name: string;
  kind: DeclarationKind;
  path: string | undefined;
  decl?: Declaration<string>;
  omit: boolean;
  deferred: DeclarationDeferKind;
  source?: Model | Scalar;
  sourceFile?: SourceFile<string> | undefined;
}

export interface DeclarationOptions {
  name: string;
  namespace: Namespace | undefined;
  kind: DeclarationKind;
  value?: string | StringBuilder;
  omit: boolean;
  sourceFile?: SourceFile<string>;
}

export interface DeferredDeclarationOptions {
  name: string;
  kind: DeclarationKind;
  source: Model | Scalar;
  omit: boolean;
}

export class DeclarationManager {
  private declarations = new Map<string, DeclarationMetadata>();

  declare(emitter: PythonPartialEmitter, options: DeclarationOptions): Declaration<string> {
    const sf = options.sourceFile ?? emitter.getSourceFile();
    const decl = emitter.declaration(options.name, options.value ?? "");
    decl.meta["omit"] = options.omit;
    const path = emitter.buildImportPathForNamespace(options.namespace);
    const fullPath = path === undefined ? options.name : `${path}.${options.name}`;
    this.declarations.set(fullPath, {
      name: options.name,
      kind: options.kind,
      path: path,
      decl: decl,
      omit: options.omit,
      deferred: DeclarationDeferKind.NotDeferred,
      source: undefined,
      sourceFile: sf,
    });
    return decl;
  }

  defer(path: string, options: DeferredDeclarationOptions) {
    this.declarations.set(`${path}`, {
      name: options.name,
      kind: options.kind,
      path: path,
      decl: undefined,
      omit: options.omit,
      deferred: DeclarationDeferKind.Deferred,
      source: options.source,
      sourceFile: undefined,
    });
  }

  get(opts: DeclarationFilters): DeclarationMetadata[] {
    // if no filters, just return everything that's not set to be omitted
    if (opts.defer === undefined && opts.kind === undefined && opts.path === undefined) {
      return Array.from(this.declarations.values()).filter((decl) => !decl.omit);
    }
    const decls: DeclarationMetadata[] = [];
    for (const [key, val] of this.declarations.entries()) {
      // never return omitted declarations. These are needed only for the emitter framework.
      if (val.omit) continue;
      if (opts.kind !== undefined && val.kind !== opts.kind) continue;
      if (opts.defer !== undefined && val.deferred !== opts.defer) continue;
      if (opts.path !== undefined && key !== opts.path) continue;
      if (opts.sourceFile !== undefined && val.sourceFile !== opts.sourceFile) continue;
      decls.push(val);
    }
    return decls;
  }

  has(name: string): boolean {
    return this.declarations.has(name);
  }
}
