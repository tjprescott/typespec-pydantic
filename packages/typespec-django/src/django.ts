import { DeclarationManager, createEmitters, PythonPartialOperationEmitter, ImportKind } from "typespec-python";
import { EmitContext, Operation, Scalar, emitFile, getNamespaceFullName } from "@typespec/compiler";
import {
  EmittedSourceFile,
  EmitterOutput,
  Placeholder,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { getHttpOperation } from "@typespec/http";

export async function $onEmit(context: EmitContext<Record<string, never>>) {
  const emitter = createEmitters(context.program, DjangoOperationEmitter, context)[0] as DjangoOperationEmitter;
  emitter.declarations = new DeclarationManager();
  emitter.emitProgram({ emitTypeSpecNamespace: false });
  emitter.emitPaths();
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
    const implFile = await emitter.buildImplementationFile(sourceFile);
    if (implFile !== undefined) {
      await emitFile(emitter.getProgram(), {
        path: implFile.path,
        content: implFile.contents,
      });
    }
  }
}

interface PathMetadata {
  url: string;
  methodPath: string;
  name?: string;
}

export class DjangoOperationEmitter extends PythonPartialOperationEmitter {
  private paths: PathMetadata[] = [];

  emitPaths() {
    const builder = new StringBuilder();
    builder.push(code`urlpatterns = [`);
    for (const path of this.paths) {
      builder.push(code`${this.indent()}path("${path.url}", ${path.methodPath}`);
      if (path.name) {
        builder.push(code`, name="${path.name}),"`);
      } else {
        builder.push(code`),`);
      }
    }
    builder.push(code`]`);
    return this.emitter.result.rawCode(builder.reduce());
  }

  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    // TODO: Django-specific boilerplate?
    this.imports.add("django.http", "HttpResponse", ImportKind.regular, sourceFile);
    this.imports.add("django.urls", "path", ImportKind.regular, sourceFile);
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
    const httpOperation = getHttpOperation(this.emitter.getProgram(), operation);
    let path = httpOperation[0].path;
    const verb = httpOperation[0].verb;
    path = path.replace(/{/g, "<").replace(/}/g, ">");
    builder.push(`@require_http_methods(["${verb.toUpperCase()}"])\n`);
    const pythonName = this.transformReservedName(this.toSnakeCase(operation.name));
    this.paths.push({
      url: path,
      methodPath: pythonName,
    });
  }

  shouldOmitImport(module: string): boolean {
    if (module.endsWith("_operations") || module === "flask") {
      return true;
    }
    return false;
  }
}
