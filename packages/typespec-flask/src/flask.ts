import { DeclarationKind, DeclarationManager, ImportKind, PythonPartialOperationEmitter } from "typespec-python";
import { EmitContext, Model, Operation, Scalar, Type, getNamespaceFullName } from "@typespec/compiler";
import {
  AssetEmitter,
  EmittedSourceFile,
  EmitterOutput,
  Placeholder,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { getHttpOperation, getOperationParameters, getRoutePath } from "@typespec/http";
import { FlaskEmitterOptions } from "./lib.js";

export async function $onEmit(context: EmitContext<FlaskEmitterOptions>) {
  const assetEmitter = context.getAssetEmitter(
    class extends FlaskEmitter {
      constructor(emitter: AssetEmitter<string, Record<string, never>>, declarations?: DeclarationManager) {
        super(emitter);
        this.declarations = new DeclarationManager();
      }
    },
  );
  assetEmitter.emitProgram({ emitTypeSpecNamespace: false });
  await assetEmitter.writeOutput();
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

  #emitRoute(builder: StringBuilder, operation: Operation) {
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

  operationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    const builder = new StringBuilder();
    this.emitDocs(builder, operation);
    this.#emitRoute(builder, operation);
    builder.push(`def ${this.transformReservedName(this.toSnakeCase(name))}(`);
    const params = getOperationParameters(this.emitter.getProgram(), operation);
    if (params.length > 0) {
      builder.push(code`${this.operationParameters(operation, operation.parameters)}`);
    }
    builder.push(`)`);
    if (operation.returnType !== undefined) {
      const returnType = this.operationReturnType(operation, operation.returnType);
      if (returnType !== "") {
        builder.push(code` -> ${returnType}`);
      }
    }
    builder.push(":\n");
    builder.push(`${this.indent(1)}pass\n`);
    return this.declarations!.declare(this, {
      name: name,
      kind: DeclarationKind.Operation,
      value: builder.reduce(),
      omit: false,
    });
  }

  operationParameters(operation: Operation, parameters: Model): EmitterOutput<string> {
    const builder = new StringBuilder();
    let i = 0;
    const length = parameters.properties.size;
    for (const param of parameters.properties.values()) {
      const paramName = this.transformReservedName(this.toSnakeCase(param.name));
      const paramType = this.emitter.emitTypeReference(param.type);
      builder.push(code`${paramName}: ${paramType}`);
      if (++i < length) builder.push(code`, `);
    }
    return builder.reduce();
  }

  operationReturnType(operation: Operation, returnType: Type): EmitterOutput<string> {
    const value = code`${this.emitter.emitTypeReference(operation.returnType)}`;
    if (returnType.kind === "Model") {
      this.imports.add(".models", returnType.name);
    }
    return value;
  }

  interfaceOperationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    const opName = `${operation.interface!.name}_${name}`;
    return this.operationDeclaration(operation, opName);
  }
}
