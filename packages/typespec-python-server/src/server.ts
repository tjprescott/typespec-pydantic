//import { PydanticEmitter } from "typespec-pydantic";
import { FlaskEmitter } from "typespec-flask";
import { EmitContext } from "@typespec/compiler";
import { PythonServerEmitterOptions } from "./lib.js";
import { AssetEmitter } from "@typespec/compiler/emitter-framework";

export async function $onEmit(context: EmitContext<PythonServerEmitterOptions>) {
  const options = context.options;
  const emitter = createPythonServerEmitter(context, options);
  await emitter.emitPython();
  // const assetEmitter = context.getAssetEmitter(PythonServerEmitter);
  // await loadEmitters(assetEmitter);
  // assetEmitter.emitProgram();
  // await assetEmitter.writeOutput();
}

function createPythonServerEmitter(
  context: EmitContext<PythonServerEmitterOptions>,
  options: PythonServerEmitterOptions,
) {
  const program = context.program;
  let modelEmitter: AssetEmitter<string, PythonServerEmitterOptions>;
  let operationEmitter: AssetEmitter<string, PythonServerEmitterOptions>;

  return { emitPython };

  async function emitPython() {
    initializeEmitters();

    //   try {
    //     const httpService = ignoreDiagnostics(getHttpService(program, service.type));
    //     reportIfNoRoutes(program, httpService.operations);

    //     for (const op of resolveOperations(httpService.operations)) {
    //       if ((op as SharedHttpOperation).kind === "shared") {
    //         emitSharedOperation(op as SharedHttpOperation);
    //       } else {
    //         emitOperation(op as HttpOperation);
    //       }
    //     }
    //     emitParameters();
    //     emitSchemas(service.type);
    //     emitTags();

    //     // Clean up empty entries
    //     if (root.components) {
    //       for (const elem of Object.keys(root.components)) {
    //         if (Object.keys(root.components[elem as any]).length === 0) {
    //           delete root.components[elem as any];
    //         }
    //       }
    //     }

    //     if (!program.compilerOptions.noEmit && !program.hasError()) {
    //       // Write out the OpenAPI document to the output path

    //       await emitFile(program, {
    //         path: resolveOutputFile(service, multipleService, version),
    //         content: serializeDocument(root, options.fileType),
    //         newLine: options.newLine,
    //       });
    //     }
    //   } catch (err) {
    //     if (err instanceof ErrorTypeFoundError) {
    //       // Return early, there must be a parse error if an ErrorType was
    //       // inserted into the TypeSpec output
    //       return;
    //     } else {
    //       throw err;
    //     }
    //   }

    // }

    function initializeEmitters() {
      //modelEmitter = context.getAssetEmitter(PydanticEmitter);
      operationEmitter = context.getAssetEmitter(FlaskEmitter);
      const test = "best";
    }
  }

  // async function loadEmitters(emitter: AssetEmitter<string, PythonServerEmitterOptions>) {
  //   // ensure that both modelEmitter and operationEmitter are supplied
  //   if (modelEmitterName === undefined && operationEmitterName === undefined) {
  //     throw new Error("model-emitter and operation-emitter are both required");
  //   } else if (modelEmitterName === undefined) {
  //     throw new Error("model-emitter is required");
  //   } else if (operationEmitterName === undefined) {
  //     throw new Error("operation-emitter is required");
  //   }
  //   // TODO: Dynamically load emitters here, eventually
  // }
}
