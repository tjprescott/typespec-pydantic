import { Model, Scalar } from "@typespec/compiler";
import { AssetEmitter, StringBuilder, Declaration } from "@typespec/compiler/emitter-framework";
import { PythonPartialEmitter } from "./python.js";

export class DeclarationManager {
  private declarations = new Set<string>();

  private deferred = new Map<string, Model | Scalar>();

  private emitter: AssetEmitter<string, Record<string, never>>;

  constructor(emitter: AssetEmitter<string, Record<string, never>>) {
    this.emitter = emitter;
  }

  has(name: string): boolean {
    return this.declarations.has(name) || this.deferred.has(name);
  }

  declare(name: string, value?: string | StringBuilder, omit: boolean = false) {
    this.declarations.add(name);
    const decl = this.emitter.result.declaration(name, value ?? "");
    decl.meta["omit"] = omit;
    return decl;
  }

  defer(name: string, model: Model | Scalar) {
    this.deferred.set(name, model);
  }

  getDeferred(): Map<string, Model | Scalar> {
    return this.deferred;
  }
}

export enum DeclarationKind {
  Model,
  Operation,
}

export interface DeclarationMetadata {
  name: string;
  kind: DeclarationKind;
  path: string;
  decl: Declaration<string>;
}

export class DeclarationManager2 {
  private declarations = new Map<string, DeclarationMetadata>();

  register(emitter: PythonPartialEmitter, decl: Declaration<string>, kind: DeclarationKind) {
    const path = emitter.buildNamespaceFromScope(decl.scope);
    const name = decl.name;
    this.declarations.set(`${path}.${name}`, {
      name: name,
      kind: kind,
      path: path,
      decl: decl,
    });
  }

  getDeclaration(fullPath: string): Declaration<string> | undefined {
    return this.declarations.get(fullPath)?.decl;
  }
}
