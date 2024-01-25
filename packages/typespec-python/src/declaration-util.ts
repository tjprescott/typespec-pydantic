import { Declaration, StringBuilder } from "@typespec/compiler/emitter-framework";
import { PythonPartialEmitter } from "./python.js";
import { Model, Scalar } from "@typespec/compiler";

export enum DeclarationKind {
  Model,
  Operation,
}

export interface DeclarationMetadata {
  name: string;
  kind: DeclarationKind;
  path: string;
  decl?: Declaration<string>;
  omit: boolean;
  isDeferred: boolean;
  source?: Model | Scalar;
}

export interface DeclarationOptions {
  name: string;
  kind: DeclarationKind;
  value?: string | StringBuilder;
  omit: boolean;
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
    const decl = emitter.getAssetEmitter().result.declaration(options.name, options.value ?? "");
    const path = emitter.buildNamespaceFromScope(decl.scope);
    decl.meta["omit"] = options.omit;
    this.declarations.set(`${path}.${options.name}`, {
      name: options.name,
      kind: options.kind,
      path: path,
      decl: decl,
      omit: options.omit,
      isDeferred: false,
      source: undefined,
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
      isDeferred: true,
      source: options.source,
    });
  }

  getDeclaration(fullPath: string): Declaration<string> | undefined {
    return this.declarations.get(fullPath)?.decl;
  }

  has(name: string): boolean {
    return this.declarations.has(name);
  }

  getDeferredDeclarations(namespace: string | undefined): DeclarationMetadata[] {
    const deferred: DeclarationMetadata[] = [];
    for (const [_, decl] of this.declarations) {
      if (!decl.isDeferred) continue;
      if (decl.omit) continue;
      const itemNs = decl.path.split(".").slice(0, -1).join(".");
      if (itemNs !== (namespace ?? "")) continue;
      deferred.push(decl);
    }
    return deferred;
  }
}
