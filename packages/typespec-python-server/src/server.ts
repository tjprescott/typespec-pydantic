import { EmitContext, Program } from "@typespec/compiler";
import { PythonServerEmitterOptions } from "./lib.js";
import {
  AssetEmitter,
  CodeTypeEmitter,
  Context,
  EmittedSourceFile,
  SourceFile,
} from "@typespec/compiler/emitter-framework";
import * as Module from "module";

export async function $onEmit(context: EmitContext<PythonServerEmitterOptions>) {
  const assetEmitter = context.getAssetEmitter(PythonServerEmitter);
  await loadEmitters(assetEmitter);
  assetEmitter.emitProgram();
  await assetEmitter.writeOutput();
}

async function loadEmitters(emitter: AssetEmitter<string, PythonServerEmitterOptions>) {
  const options = emitter.getOptions();
  const modelEmitterName = options["model-emitter"];
  const operationEmitterName = options["operation-emitter"];
  // ensure that both modelEmitter and operationEmitter are supplied
  if (modelEmitterName === undefined && operationEmitterName === undefined) {
    throw new Error("model-emitter and operation-emitter are both required");
  } else if (modelEmitterName === undefined) {
    throw new Error("model-emitter is required");
  } else if (operationEmitterName === undefined) {
    throw new Error("operation-emitter is required");
  }
  const modelEmitter: any = await import(modelEmitterName);
  const operationEmitter: any = await import(operationEmitterName);
}

class PythonServerEmitter extends CodeTypeEmitter {
  #getModelEmitter(): Module {
    if ((this.emitter as any).modelEmitter === undefined) {
      throw new Error("model-emitter is not loaded");
    }
    return (this.emitter as any).modelEmitter;
  }

  #getOperationEmitter(): Module {
    if ((this.emitter as any).operationEmitter === undefined) {
      throw new Error("operation-emitter is not loaded");
    }
    return (this.emitter as any).operationEmitter;
  }

  programContext(program: Program): Context {
    const options = this.emitter.getOptions();
    const outFile = options["output-file"];
    const sourceFile = this.emitter.createSourceFile(outFile);
    return {
      scope: sourceFile.globalScope,
    };
  }

  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    const emittedSourceFile: EmittedSourceFile = {
      path: sourceFile.path,
      contents: "",
    };

    for (const decl of sourceFile.globalScope.declarations) {
      if (decl.value === undefined || decl.value === "") continue;
      emittedSourceFile.contents += decl.value + "\n";
    }

    return emittedSourceFile;
  }
}
