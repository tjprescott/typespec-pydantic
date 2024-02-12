import { EmitContext, Scalar, emitFile } from "@typespec/compiler";
import { AssetEmitter, Placeholder, SourceFile } from "@typespec/compiler/emitter-framework";
import { PydanticEmitter } from "typespec-pydantic";
import {
  DeclarationManager,
  PythonPartialEmitter,
  PythonPartialModelEmitter,
  PythonPartialOperationEmitter,
  createEmitters,
} from "typespec-python";
import { FlaskEmitter } from "typespec-flask";

interface FilePair {
  model?: SourceFile<string>;
  operation?: SourceFile<string>;
}

async function loadModelEmitter(
  packageName: string,
  context: EmitContext<Record<string, never>>,
): Promise<PythonPartialModelEmitter | undefined> {
  try {
    const module = await import(packageName);
    for (const key in module) {
      const val = module[key];
      const prototype = val.prototype;
      if (prototype instanceof PythonPartialModelEmitter) {
        const constructor = val;
        const emitter = createEmitters(context.program, constructor, context)[0] as PythonPartialModelEmitter;
        return emitter;
      }
    }
    throw new Error(`Failed to load emitter for package ${packageName}`);
  } catch (e) {
    throw new Error(`Failed to load emitter for package ${packageName}`);
  }
}

async function loadOperationEmitter(
  packageName: string,
  context: EmitContext<Record<string, never>>,
): Promise<PythonPartialOperationEmitter | undefined> {
  try {
    const module = await import(packageName);
    for (const key in module) {
      const val = module[key];
      const prototype = val.prototype;
      if (prototype instanceof PythonPartialOperationEmitter) {
        const constructor = val;
        const emitter = createEmitters(context.program, constructor, context)[0] as PythonPartialOperationEmitter;
        return emitter;
      }
    }
    throw new Error(`Failed to load emitter for package ${packageName}`);
  } catch (e) {
    throw new Error(`Failed to load emitter for package ${packageName}`);
  }
}

export async function $onEmit(context: EmitContext<Record<string, never>>) {
  const serverEmitter = new PythonServerEmitter(
    context.getAssetEmitter(
      class extends PythonServerEmitter {
        constructor(emitter: AssetEmitter<string, Record<string, never>>) {
          super(emitter, context);
          this.declarations = new DeclarationManager();
        }
      },
    ),
    context,
  );
  const options = context.options;
  const modelEmitterPackage = options["model-emitter"] ?? "typespec-pydantic";
  const operationEmitterPackage = options["operation-emitter"] ?? "typespec-flask";
  const modelEmitter = (await loadModelEmitter(modelEmitterPackage, context)) as PythonPartialModelEmitter;
  const operationEmitter = (await loadOperationEmitter(
    operationEmitterPackage,
    context,
  )) as PythonPartialOperationEmitter;
  modelEmitter.declarations = serverEmitter.declarations;
  operationEmitter.declarations = serverEmitter.declarations;
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

export class PythonServerEmitter extends PythonPartialEmitter {
  public modelEmitter!: PythonPartialModelEmitter;
  public operationEmitter!: PythonPartialOperationEmitter;

  constructor(emitter: AssetEmitter<string, Record<string, never>>, context: EmitContext<Record<string, never>>) {
    const declarations = new DeclarationManager();
    super(emitter);
    this.declarations = declarations;
  }

  emitScalar(scalar: Scalar, name: string, sourceFile?: SourceFile<string> | undefined): string | Placeholder<string> {
    throw new Error("Method not implemented.");
  }

  /** Matches models.py and operations.py files */
  matchSourceFiles(modelFiles: SourceFile<string>[], operationFiles: SourceFile<string>[]): Map<string, FilePair> {
    const matchedFiles = new Map<string, FilePair>();
    for (const sf of [...modelFiles, ...operationFiles]) {
      // filter out empty files
      if (sf.globalScope.declarations.length === 0) continue;
      const path = sf.path;
      const folder = path.substring(0, path.lastIndexOf("/"));
      if (!matchedFiles.has(folder)) {
        matchedFiles.set(folder, {});
      }
      if (path.endsWith("models.py")) {
        matchedFiles.get(folder)!.model = sf;
      } else if (path.endsWith("operations.py")) {
        matchedFiles.get(folder)!.operation = sf;
      } else {
        throw new Error(`Unexpected file ${path}`);
      }
    }
    return matchedFiles;
  }
}
