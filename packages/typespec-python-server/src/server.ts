import { EmitContext } from "@typespec/compiler";
import { PythonServerEmitterOptions } from "./lib.js";
import { AssetEmitter } from "@typespec/compiler/emitter-framework";
import { PydanticEmitter } from "typespec-pydantic";
import { DeclarationManager } from "typespec-python";
import { FlaskEmitter } from "typespec-flask";

export async function $onEmit(context: EmitContext<PythonServerEmitterOptions>) {
  const options = context.options;
  const emitter = createPythonServerEmitter(context, options);
  await emitter.emitPython();
}

function createPythonServerEmitter(
  context: EmitContext<PythonServerEmitterOptions>,
  options: PythonServerEmitterOptions,
) {
  let modelEmitter: AssetEmitter<string, PythonServerEmitterOptions>;
  let operationEmitter: AssetEmitter<string, PythonServerEmitterOptions>;
  const declarations = new DeclarationManager();

  return { emitPython };

  async function emitPython() {
    initializeEmitters();

    modelEmitter.emitProgram();
    operationEmitter.emitProgram();
    await modelEmitter.writeOutput();
    await operationEmitter.writeOutput();

    function initializeEmitters() {
      modelEmitter = context.getAssetEmitter(
        class extends PydanticEmitter {
          constructor(emitter: AssetEmitter<string, Record<string, never>>) {
            super(emitter, declarations);
          }
        },
      );
      operationEmitter = context.getAssetEmitter(
        class extends FlaskEmitter {
          constructor(emitter: AssetEmitter<string, Record<string, never>>) {
            super(emitter, declarations);
          }
        },
      );
    }
  }
}
