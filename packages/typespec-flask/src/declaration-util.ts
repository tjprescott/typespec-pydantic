import { Model, Scalar } from "@typespec/compiler";

export class DeclarationManager {
  private declarations = new Set<string>();

  private deferred = new Map<string, Model | Scalar>();

  isDeclared(name: string): boolean {
    return this.declarations.has(name);
  }

  declare(name: string) {
    this.declarations.add(name);
  }

  defer(name: string, model: Model | Scalar) {
    this.deferred.set(name, model);
  }

  getDeferred(): Map<string, Model | Scalar> {
    return this.deferred;
  }
}
