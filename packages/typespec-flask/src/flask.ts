import { DeclarationKind, DeclarationManager, ImportKind, PythonPartialEmitter } from "typespec-python";
import {
  BooleanLiteral,
  EmitContext,
  Interface,
  Model,
  Namespace,
  NumericLiteral,
  Operation,
  Program,
  Scalar,
  StringLiteral,
  Type,
  getNamespaceFullName,
} from "@typespec/compiler";
import {
  AssetEmitter,
  Context,
  EmittedSourceFile,
  EmitterOutput,
  Placeholder,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { getOperationParameters, getRoutePath } from "@typespec/http";
import { FlaskEmitterOptions } from "./lib.js";

export async function $onEmit(context: EmitContext<FlaskEmitterOptions>) {
  const assetEmitter = context.getAssetEmitter(
    class extends FlaskEmitter {
      constructor(emitter: AssetEmitter<string, Record<string, never>>, declarations?: DeclarationManager) {
        super(emitter);
        this.declarations = declarations;
      }
    },
  );
  assetEmitter.emitProgram();
  await assetEmitter.writeOutput();
}

export class FlaskEmitter extends PythonPartialEmitter {
  constructor(emitter: AssetEmitter<string, Record<string, never>>, declarations?: DeclarationManager) {
    super(emitter);
    this.declarations = declarations;
  }

  programContext(program: Program): Context {
    const options = this.emitter.getOptions();
    const outFile = options["output-file"] ?? "operations.py";
    const sourceFile = this.emitter.createSourceFile(outFile);
    return {
      scope: sourceFile.globalScope,
    };
  }

  /** Create a new source file for each namespace. */
  namespaceContext(namespace: Namespace): Context {
    if (namespace.name === "TypeSpec") {
      return {};
    }
    const fullPath = getNamespaceFullName(namespace)
      .split(".")
      .map((seg) => this.toSnakeCase(seg))
      .join("/");
    const operationsFile = this.emitter.createSourceFile(`${fullPath}/operations.py`);
    return {
      scope: operationsFile.globalScope,
    };
  }

  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    const builder = new StringBuilder();

    this.imports.add("flask", "Flask", ImportKind.regular, sourceFile);
    for (const [moduleName, names] of this.imports.getImports(sourceFile, ImportKind.regular)) {
      builder.push(code`from ${moduleName} import ${[...names].join(", ")}\n`);
    }

    const deferredImports = this.imports.getImports(sourceFile, ImportKind.deferred);
    if (deferredImports.size > 0) {
      builder.push(code`\nif TYPE_CHECKING:\n`);
      for (const [moduleName, names] of deferredImports) {
        builder.push(code`${this.indent()}from ${moduleName} import ${[...names].join(", ")}\n`);
      }
    }

    const emittedSourceFile: EmittedSourceFile = {
      path: sourceFile.path,
      contents: `${builder.reduce()}\napp = Flask(__name__)\n\n`,
    };

    for (const decl of sourceFile.globalScope.declarations) {
      if (decl.value === undefined || decl.value === "") continue;
      emittedSourceFile.contents += decl.value + "\n";
    }

    return emittedSourceFile;
  }

  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    const namespace = this.buildNamespaceFromModel(model);
    const existing = this.declarations?.getDeclaration(`${namespace}.${name}`);
    if (!existing) {
      throw new Error(`Declaration for ${namespace}.${name} not found`);
    }
    return existing;
  }

  booleanLiteral(boolean: BooleanLiteral): EmitterOutput<string> {
    const val = boolean.value ? "True" : "False";
    return code`${val}`;
  }

  numericLiteral(number: NumericLiteral): EmitterOutput<string> {
    return code`${number.value.toString()}`;
  }

  stringLiteral(string: StringLiteral): EmitterOutput<string> {
    return code`"${string.value}"`;
  }

  #emitScalar(scalar: Scalar, name: string): string | Placeholder<string> {
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
    return this.emitter.result.declaration(converted, this.#emitScalar(scalar, converted));
  }

  scalarInstantiation(scalar: Scalar, name: string | undefined): EmitterOutput<string> {
    // Unsupported.
    return this.emitter.result.none();
  }

  #emitRoute(builder: StringBuilder, operation: Operation) {
    let path = getRoutePath(this.emitter.getProgram(), operation)?.path ?? "/";
    path = path.replace(/{/g, "<").replace(/}/g, ">");
    builder.push(`@app.route("${path}")\n`);
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

  interfaceDeclaration(iface: Interface, name: string): EmitterOutput<string> {
    // Operation interfaces not supported
    return this.emitter.result.none();
  }

  interfaceOperationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    // Operation interfaces not supported
    return this.emitter.result.none();
  }
}
