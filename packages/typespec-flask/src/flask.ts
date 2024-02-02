import { DeclarationKind, DeclarationManager, ImportKind, PythonPartialOperationEmitter } from "typespec-python";
import { EmitContext, Operation, Scalar, emitFile, getNamespaceFullName } from "@typespec/compiler";
import {
  EmittedSourceFile,
  EmitterOutput,
  Placeholder,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { createEmitters } from "typespec-python";
import { getHttpOperation } from "@typespec/http";

export async function $onEmit(context: EmitContext<Record<string, never>>) {
  const emitter = createEmitters(context.program, FlaskEmitter, context)[0] as FlaskEmitter;
  emitter.declarations = new DeclarationManager();
  emitter.emitProgram({ emitTypeSpecNamespace: false });
  await emitter.writeAllOutput();

  // early exit if compiler is set to not emit
  if (emitter.getProgram().compilerOptions.noEmit) {
    return;
  }

  // now write the init and implementation files
  const sourceFiles = emitter.getSourceFiles();
  for (const sourceFile of sourceFiles) {
    const initFile = await emitter.buildInitFile(new Map([[sourceFile.path, sourceFile]]));
    if (initFile !== undefined) {
      await emitFile(emitter.getProgram(), {
        path: initFile.path,
        content: initFile.contents,
      });
    }
    const declarations = emitter.declarations!.get({ sourceFile: sourceFile, kind: DeclarationKind.Operation });
    if (declarations.length > 0) {
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

export class FlaskEmitter extends PythonPartialOperationEmitter {
  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    this.imports.add("flask", "Flask", ImportKind.regular, sourceFile);
    sourceFile.meta["preamble"] = code`\napp = Flask(__name__)\n`;
    return super.sourceFile(sourceFile);
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

  shouldOmitImport(module: string): boolean {
    if (module.endsWith("_operations") || module === "flask") {
      return true;
    }
    return false;
  }
}
