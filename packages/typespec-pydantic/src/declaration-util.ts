import { Model, Scalar } from "@typespec/compiler";

export interface DeclarationMetadata {
  name: string;
  kind: "model" | "namespace";
}

export class DeclarationManager {
  private declarations = new Set<DeclarationMetadata>();

  private deferred = new Map<string, Model | Scalar>();

  isDeclared(name: string): boolean {
    return Array.from(this.declarations).some((decl) => decl.name === name);
  }

  getMetadata(name: string): DeclarationMetadata | undefined {
    return Array.from(this.declarations).find((decl) => decl.name === name);
  }

  declare(name: string, kind: "model" | "namespace") {
    this.declarations.add({ name: name, kind: kind });
  }

  defer(name: string, model: Model | Scalar) {
    this.deferred.set(name, model);
  }

  getDeferred(): Map<string, Model | Scalar> {
    return this.deferred;
  }
}
