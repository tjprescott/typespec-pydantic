import { Model, Scalar } from "@typespec/compiler";
import { AssetEmitter, StringBuilder } from "@typespec/compiler/emitter-framework";

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

  declare(name: string, value?: string | StringBuilder) {
    this.declarations.add(name);
    return this.emitter.result.declaration(name, value ?? "");
  }

  defer(name: string, model: Model | Scalar) {
    this.deferred.set(name, model);
  }

  getDeferred(): Map<string, Model | Scalar> {
    return this.deferred;
  }
}
