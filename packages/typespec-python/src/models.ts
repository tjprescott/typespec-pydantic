import { Namespace, Program } from "@typespec/compiler";
import { PythonPartialEmitter } from "./python.js";
import { AssetEmitter, Context } from "@typespec/compiler/emitter-framework";
import { DeclarationManager } from "./declaration-util.js";

export abstract class PythonPartialModelEmitter extends PythonPartialEmitter {
  private fileName = "models.py";

  constructor(emitter: AssetEmitter<string, Record<string, never>>, declarations?: DeclarationManager) {
    super(emitter);
    this.declarations = declarations;
  }

  programContext(program: Program): Context {
    console.log(`programContext: ${program}`);
    return this.createProgramContext(this.fileName);
  }

  namespaceContext(namespace: Namespace): Context {
    console.log(`namespaceContext: ${namespace.name}`);
    return this.createNamespaceContext(namespace, this.fileName);
  }
}
