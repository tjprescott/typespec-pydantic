import {
  BooleanLiteral,
  EmitContext,
  Interface,
  Model,
  NumericLiteral,
  Operation,
  Program,
  Scalar,
  StringLiteral,
  Type,
  getDoc,
  getNamespaceFullName,
} from "@typespec/compiler";
import {
  CodeTypeEmitter,
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
import { DeclarationManager } from "./declaration-util.js";

export async function $onEmit(context: EmitContext<FlaskEmitterOptions>) {
  const assetEmitter = context.getAssetEmitter(FlaskEmitter);

  assetEmitter.emitProgram();

  await assetEmitter.writeOutput();
}

export class FlaskEmitter extends CodeTypeEmitter {
  static readonly pythonIndent = "    ";

  static readonly builtInPythonTypes = [
    "int",
    "float",
    "complex",
    "str",
    "list",
    "tuple",
    "range",
    "bytes",
    "bytearray",
    "memoryview",
    "dict",
    "bool",
    "set",
    "frozenset",
  ];

  static readonly reservedPythonKeywords = [
    "and",
    "as",
    "assert",
    "break",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "False",
    "finally",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "None",
    "nonlocal",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "True",
    "try",
    "while",
    "with",
    "yield",
  ];

  private declarations = new DeclarationManager();

  #addDeferredImport(module: string, name: string) {
    const context = this.emitter.getContext();
    if (context.scope.kind === "sourceFile") {
      const sourceFile: SourceFile<string> = context.scope.sourceFile;

      // If the import has already been registered as a regular one, remove it
      const regularImports = new Set(sourceFile.imports.get(module));
      if (regularImports !== undefined) {
        regularImports.delete(name);
        if (regularImports.size === 0) {
          sourceFile.imports.delete(module);
        } else {
          sourceFile.imports.set(module, [...regularImports]);
        }
      }

      const deferredImports =
        (sourceFile.meta["deferredImports"] as Map<string, Set<string>>) ?? new Map<string, Set<string>>();
      const moduleImports = new Set(deferredImports.get(module) ?? []);
      moduleImports.add(name);
      deferredImports.set(module, moduleImports);
      sourceFile.meta["deferredImports"] = deferredImports;
    } else {
      throw new Error("Expected source file scope");
    }
  }

  #isDeferredImport(sourceFile: SourceFile<string>, module: string, name: string): boolean {
    const deferredImports = sourceFile.meta["deferredImports"] as Map<string, Set<string>>;
    if (deferredImports === undefined) return false;
    const moduleImports = deferredImports.get(module);
    if (moduleImports === undefined) return false;
    return moduleImports.has(name);
  }

  #addImport(module: string, name: string, sourceFile?: SourceFile<string>) {
    if (sourceFile === undefined) {
      const context = this.emitter.getContext();
      if (context.scope.kind === "sourceFile") {
        sourceFile = context.scope.sourceFile;
      } else {
        throw new Error("Expected source file scope");
      }
    }
    if (sourceFile === undefined) {
      throw new Error("Unable to determine source file. Please pass it in as an argument.");
    }

    // ensure this is not already in deferredImports
    if (this.#isDeferredImport(sourceFile, module, name)) {
      return;
    }

    const moduleImports = new Set(sourceFile.imports.get(module) ?? []);
    moduleImports.add(name);
    sourceFile.imports.set(module, [...moduleImports]);
  }

  #indent(count: number = 1) {
    let val = "";
    for (let i = 0; i < count; i++) {
      val += FlaskEmitter.pythonIndent;
    }
    return val;
  }

  #getBaseScalar(type: Scalar): Scalar {
    if (type.baseScalar !== undefined) {
      return this.#getBaseScalar(type.baseScalar);
    }
    return type;
  }

  #isLiteral(type: Type): boolean {
    return ![
      "Scalar",
      "Enum",
      "Union",
      "Model",
      "Tuple",
      "UnionVariant",
      "EnumMember",
      "ModelProperty",
      "Intrinsic",
    ].includes(type.kind);
  }

  /// Converts camelCase name to snake_case.
  #toSnakeCase(name: string): string {
    const value = name.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (value.startsWith("_")) {
      return value.substring(1);
    }
    return value;
  }

  /// Converts camelCase or snake_case name to PascalCase.
  #toPascalCase(name: string): string {
    let value = name;
    // convert snake case to pascal case
    if (name.includes("_")) {
      const words = name.split("_");
      value = words.map((word) => word[0].toUpperCase() + word.substring(1)).join("");
    }
    // ensure first letter is capitalized
    return value[0].toUpperCase() + value.substring(1);
  }

  /// Transforms names that start with numbers or are reserved keywords.
  #checkName(name: string): string {
    if (FlaskEmitter.reservedPythonKeywords.includes(name)) {
      return `${name}_`;
    } else if (name.match(/^\d/)) {
      return `_${name}`;
    }
    return name;
  }

  #isDeclared(name: string): boolean {
    return this.declarations.isDeclared(name);
  }

  #declare(name: string, value: string | StringBuilder | undefined) {
    this.declarations.declare(name);
    return this.emitter.result.declaration(name, value ?? "");
  }

  programContext(program: Program): Context {
    const options = this.emitter.getOptions();
    const outFile = options["output-file"] ?? "operations.py";
    const sourceFile = this.emitter.createSourceFile(outFile);
    return {
      scope: sourceFile.globalScope,
    };
  }

  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    const builder = new StringBuilder();

    this.#addImport("flask", "Flask");
    for (const [moduleName, names] of sourceFile.imports.entries()) {
      builder.push(code`from ${moduleName} import ${[...names].join(", ")}\n`);
    }

    const deferredImports = sourceFile.meta["deferredImports"] as Map<string, Set<string>>;
    if (deferredImports !== undefined) {
      builder.push(code`\nif TYPE_CHECKING:\n`);
      for (const [moduleName, names] of deferredImports.entries()) {
        builder.push(code`${this.#indent()}from ${moduleName} import ${[...names].join(", ")}\n`);
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

  #emitDocs(builder: StringBuilder, type: Type, indent: number = 0) {
    const docs = getDoc(this.emitter.getProgram(), type);
    if (docs === undefined) return;
    if (docs.split("\n").length > 1) {
      builder.push(code`${this.#indent(indent)}"""\n`);
      for (const line of docs.split("\n")) {
        builder.push(code`${this.#indent(indent)}${line}\n`);
      }
      builder.push(code`${this.#indent(indent)}"""\n`);
    } else {
      builder.push(code`${this.#indent(indent)}"""${docs}"""\n`);
    }
  }

  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    return this.#declare(name, undefined);
  }

  // modelLiteral(model: Model): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // modelInstantiation(model: Model, name: string | undefined): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // modelProperties(model: Model): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // modelPropertyLiteral(property: ModelProperty): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // modelPropertyReference(property: ModelProperty): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // enumDeclaration(en: Enum, name: string): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // enumMembers(en: Enum): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // enumMember(member: EnumMember): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // enumMemberReference(member: EnumMember): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // arrayDeclaration(array: Model, name: string, elementType: Type): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // arrayLiteral(array: Model, elementType: Type): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

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

  // intrinsic(intrinsic: IntrinsicType, name: string): EmitterOutput<string> {
  //   switch (name) {
  //     case "never":
  //       // Unsupported: See `intrinsic-type-unsupported` rule
  //       return this.emitter.result.none();
  //     case "unknown":
  //       return code`object`;
  //     case "null":
  //     case "void":
  //       return code`None`;
  //     default:
  //       reportDiagnostic(this.emitter.getProgram(), {
  //         code: "unexpected-error",
  //         target: intrinsic,
  //       });
  //       return code`object`;
  //   }
  // }

  #convertScalarName(scalar: Scalar, name: string | undefined): string {
    const scalarName = name ?? scalar.name;
    const isBuiltIn = FlaskEmitter.builtInPythonTypes.includes(scalarName);
    switch (scalarName) {
      case "boolean":
        return "bool";
      case "string":
      case "url":
        return "str";
      case "null":
      case "void":
      case "never":
        return "None";
      case "unixTimestamp32":
      case "uint8":
      case "uint16":
      case "uint32":
      case "uint64":
      case "safeint":
      case "integer":
      case "int8":
      case "int16":
      case "int32":
      case "int64":
        return "int";
      case "float":
      case "float16":
      case "float32":
      case "float64":
        return "float";
      case "duration":
        this.#addImport("datetime", "timedelta");
        return "timedelta";
      case "offsetDateTime":
        return "str";
      case "numeric":
      case "decimal":
      case "decimal128":
        this.#addImport("decimal", "Decimal");
        return "Decimal";
      case "plainDate":
        this.#addImport("datetime", "date");
        return "date";
      case "plainTime":
        this.#addImport("datetime", "time");
        return "time";
      case "utcDateTime":
        this.#addImport("datetime", "datetime");
        return "datetime";
      case "object":
      case "unknown":
        return "object";
      default:
        if (isBuiltIn) {
          return scalarName;
        }
        return this.#toPascalCase(scalarName);
    }
  }

  #emitScalar(scalar: Scalar, name: string): string | Placeholder<string> {
    const builder = new StringBuilder();
    builder.push(code`${this.#checkName(this.#toPascalCase(name))}`);
    return builder.reduce();
  }

  scalarDeclaration(scalar: Scalar, name: string): EmitterOutput<string> {
    // workaround to avoid emitting scalar template declarations
    if (scalar.node.templateParameters.length > 0) {
      return this.emitter.result.none();
    }
    const converted = this.#convertScalarName(scalar, name);
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
    this.#emitDocs(builder, operation);
    this.#emitRoute(builder, operation);
    builder.push(`def ${this.#checkName(this.#toSnakeCase(name))}(`);
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
    builder.push(`${this.#indent(1)}pass\n`);
    return this.#declare(name, builder.reduce());
  }

  operationParameters(operation: Operation, parameters: Model): EmitterOutput<string> {
    const builder = new StringBuilder();
    let i = 0;
    const length = parameters.properties.size;
    for (const param of parameters.properties.values()) {
      const paramName = this.#checkName(this.#toSnakeCase(param.name));
      const paramType = this.emitter.emitTypeReference(param.type);
      builder.push(code`${paramName}: ${paramType}`);
      if (++i < length) builder.push(code`, `);
    }
    return builder.reduce();
  }

  operationReturnType(operation: Operation, returnType: Type): EmitterOutput<string> {
    const value = code`${this.emitter.emitTypeReference(operation.returnType)}`;
    if (returnType.kind === "Model") {
      this.#addImport(".models", returnType.name);
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

  // tupleLiteral(tuple: Tuple): EmitterOutput<string> {
  //   const builder = new StringBuilder();
  //   let i = 0;
  //   const length = tuple.values.length;
  //   this.#addImport("typing", "Tuple");
  //   builder.push(code`Tuple[`);
  //   for (const item of tuple.values) {
  //     builder.push(code`${this.emitter.emitTypeReference(item)}`);
  //     if (++i < length) builder.push(code`, `);
  //     else builder.push(code`]`);
  //   }
  //   return builder.reduce();
  // }

  // unionDeclaration(union: Union, name: string): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // unionInstantiation(union: Union, name: string): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // unionLiteral(union: Union): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }

  // /**
  //  * Returns a string representation of the union type. If all variants are literals
  //  * it will return only `Literal[...]`. If all variants are non-literals it will
  //  * return only `Union[...]`. If there are both literal and non-literal variants
  //  * the literals will be listed first (`Union[Literal[...], ...]`).
  //  */
  // unionVariants(union: Union): EmitterOutput<string> {
  //   // Unsupported.
  //   return this.emitter.result.none();
  // }
}
