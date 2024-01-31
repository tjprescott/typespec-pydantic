import { Namespace, Program } from "@typespec/compiler";
import { PythonPartialEmitter } from "./python.js";
import { Context } from "@typespec/compiler/emitter-framework";

export abstract class PythonPartialModelEmitter extends PythonPartialEmitter {
  private fileName = "models.py";

  programContext(program: Program): Context {
    return this.createProgramContext(this.fileName);
  }

  namespaceContext(namespace: Namespace): Context {
    return this.createNamespaceContext(namespace, this.fileName);
  }
}
