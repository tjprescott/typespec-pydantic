import { DeclarationKind, DeclarationManager, ImportKind, PythonPartialOperationEmitter } from "typespec-python";
import { EmitContext, Model, Operation, Scalar, emitFile, getNamespaceFullName } from "@typespec/compiler";
import {
  AssetEmitter,
  EmittedSourceFile,
  EmitterOutput,
  Placeholder,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { getHttpOperation } from "@typespec/http";

export async function $onEmit(context: EmitContext<Record<string, never>>) {
  const defaultDeclarationManager = new DeclarationManager();
  const emitter = new FlaskEmitter(
    context.getAssetEmitter(
      class extends FlaskEmitter {
        constructor(emitter: AssetEmitter<string, Record<string, never>>, declarations?: DeclarationManager) {
          super(emitter);
          this.declarations = declarations ?? defaultDeclarationManager;
        }
      },
    ),
    defaultDeclarationManager,
  );
  emitter.emitProgram({ emitTypeSpecNamespace: false });
  await emitter.writeAllOutput();
  if (!emitter.getProgram().compilerOptions.noEmit) {
    for (const sourceFile of emitter.getSourceFiles()) {
      if (sourceFile.globalScope.declarations.length > 0) {
        const initFile = await emitter.buildInitFile(new Map([[sourceFile.path, sourceFile]]));
        await emitFile(emitter.getProgram(), {
          path: initFile.path,
          content: initFile.contents,
        });
        const implFile = await emitter.buildImplementationFile(sourceFile);
        if (implFile !== undefined) {
          await emitFile(emitter.getProgram(), {
            path: implFile.path,
            content: implFile.contents,
          });
        }
      }
    }
  }
}

export class FlaskEmitter extends PythonPartialOperationEmitter {
  constructor(emitter: AssetEmitter<string, Record<string, never>>, declarations?: DeclarationManager) {
    super(emitter);
    this.declarations = declarations;
  }

  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    this.imports.add("flask", "Flask", ImportKind.regular, sourceFile);
    sourceFile.meta["preamble"] = code`\napp = Flask(__name__)\n`;
    return super.sourceFile(sourceFile);
  }

  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    const namespace = this.buildNamespaceFromModel(model);
    const fullPath = namespace === "" ? name : `${namespace}.${name}`;
    const existing = this.declarations!.getDeclaration(fullPath);
    if (!existing) {
      return this.declarations!.declare(this, {
        name: name,
        kind: DeclarationKind.Model,
        value: undefined,
        omit: true,
      });
    }
    return existing;
  }

  emitScalar(scalar: Scalar, name: string, sourceFile?: SourceFile<string>): string | Placeholder<string> {
    const builder = new StringBuilder();
    builder.push(code`${this.transformReservedName(this.toPascalCase(name))}`);
    return builder.reduce();
  }

  scalarDeclaration(scalar: Scalar, name: string): EmitterOutput<string> {
    // workaround to avoid emitting scalar template declarations
    if (scalar.node.templateParameters.length > 0) {
      return this.emitter.result.none();
    }
    const converted = this.convertScalarName(scalar, name);
    // don't redeclare TypeSpec scalars
    if (scalar.namespace !== undefined) {
      const namespaceName = getNamespaceFullName(scalar.namespace);
      if (namespaceName === "TypeSpec") {
        return code`${converted}`;
      }
    }
    return this.emitter.result.declaration(converted, this.emitScalar(scalar, converted));
  }

  scalarInstantiation(scalar: Scalar, name: string | undefined): EmitterOutput<string> {
    // Unsupported.
    return this.emitter.result.none();
  }

  emitRoute(builder: StringBuilder, operation: Operation) {
    // FIXME: include the HTTP methods and append the interface route...
    const httpOperation = getHttpOperation(this.emitter.getProgram(), operation);
    let path = httpOperation[0].path;
    const verb = httpOperation[0].verb;
    path = path.replace(/{/g, "<").replace(/}/g, ">");
    builder.push(`@app.route("${path}"`);
    if (verb) {
      builder.push(`, methods=["${verb.toUpperCase()}"]`);
    }
    builder.push(`)\n`);
  }
}
