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
  const emitterName = context.options.emitterName;
  let emitter: PythonPartialEmitter;
  switch (emitterName) {
    case "models":
      emitter = createEmitters(context.program, DjangoModelEmitter, context)[0] as DjangoModelEmitter;
      break;
    case "operations":
      emitter = createEmitters(context.program, DjangoOperationEmitter, context)[0] as DjangoOperationEmitter;
      break;
    default:
      throw new Error(`Unknown emit kind: ${emitterName}`);
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
