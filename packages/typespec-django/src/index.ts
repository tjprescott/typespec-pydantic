import { EmitContext, emitFile } from "@typespec/compiler";
import { DeclarationManager, PythonPartialEmitter, createEmitters } from "typespec-python";
import { DjangoModelEmitter } from "./django-models.js";
import { DjangoOperationEmitter } from "./django.js";

// Re-export $lib to the compiler can get access to it and register your library correctly.
export { $lib } from "./lib.js";
export * from "./django-models.js";
export * from "./django.js";
export * from "./decorators.js";

export async function $onEmit(context: EmitContext<Record<string, never>>) {
  const emitKind = context.options["emit-kind"];
  let emitter: PythonPartialEmitter;
  switch (emitKind) {
    case "models":
      emitter = createEmitters(context.program, DjangoModelEmitter, context)[0] as DjangoModelEmitter;
      break;
    case "operations":
      emitter = createEmitters(context.program, DjangoOperationEmitter, context)[0] as DjangoOperationEmitter;
      break;
    case "full":
      await emitFullOutput(context);
      return;
    default:
      throw new Error(`Invalid emit kind: ${emitKind}`);
  }
  emitter.declarations = new DeclarationManager();
  emitter.emitProgram({ emitTypeSpecNamespace: false });
  await emitter.writeAllOutput();
  if (!emitter.getProgram().compilerOptions.noEmit) {
    for (const sourceFile of emitter.getSourceFiles()) {
      const initFile = await emitter.buildInitFile(new Map([[sourceFile.path, sourceFile]]));
      if (initFile !== undefined) {
        await emitFile(emitter.getProgram(), {
          path: initFile.path,
          content: initFile.contents,
        });
      }
    }
  }
}

async function emitFullOutput(context: EmitContext<Record<string, never>>) {
  const options = context.options;
  const modelEmitter = createEmitters(context.program, DjangoModelEmitter, context)[0] as DjangoModelEmitter;
  const operationEmitter = createEmitters(
    context.program,
    DjangoOperationEmitter,
    context,
  )[0] as DjangoOperationEmitter;
  const declarations = new DeclarationManager();
  modelEmitter.declarations = declarations;
  operationEmitter.declarations = declarations;
  serverEmitter.modelEmitter = modelEmitter;
  serverEmitter.operationEmitter = operationEmitter;

  modelEmitter.emitProgram();
  operationEmitter.emitProgram();
  await modelEmitter.writeAllOutput();
  await operationEmitter.writeAllOutput();
  if (!serverEmitter.getProgram().compilerOptions.noEmit) {
    const matchedFiles = serverEmitter.matchSourceFiles(
      modelEmitter.getSourceFiles(),
      operationEmitter.getSourceFiles(),
    );
    for (const [path, meta] of matchedFiles) {
      const model = meta.model;
      const operation = meta.operation;
      if (!model || !operation) {
        throw new Error(`Missing model or operation file for ${path}`);
      }
      const map = new Map<string, SourceFile<string>>();
      map.set(model.path, model);
      map.set(operation.path, operation);
      const initFile = await serverEmitter.buildInitFile(map);
      if (initFile === undefined) continue;
      await emitFile(serverEmitter.getProgram(), {
        path: initFile.path,
        content: initFile.contents,
      });
      if (meta.operation !== undefined) {
        const implFile = await operationEmitter.buildImplementationFile(meta.operation);
        if (implFile !== undefined) {
          await emitFile(operationEmitter.getProgram(), {
            path: implFile.path,
            content: implFile.contents,
          });
        }
      }
    }
  }
}
