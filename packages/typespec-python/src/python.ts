import {
  BooleanLiteral,
  IntrinsicType,
  Model,
  Namespace,
  NumericLiteral,
  Program,
  Scalar,
  StringLiteral,
  Tuple,
  Type,
  Union,
  emitFile,
  getDiscriminator,
  getDoc,
  getNamespaceFullName,
} from "@typespec/compiler";
import {
  AssetEmitter,
  CodeTypeEmitter,
  Context,
  Declaration,
  EmittedSourceFile,
  EmitterOutput,
  Placeholder,
  Scope,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { ImportManager, ImportKind } from "./import-util.js";
import { DeclarationManager } from "./declaration-util.js";
import { reportDiagnostic } from "./lib.js";

interface UnionVariantMetadata {
  type: Type;
  value: string | StringBuilder;
}

export abstract class PythonPartialEmitter extends CodeTypeEmitter {
  protected currNamespace: string[] = [];

  protected imports: ImportManager;

  protected declarations?: DeclarationManager;

  constructor(emitter: AssetEmitter<string, Record<string, never>>) {
    super(emitter);
    this.imports = new ImportManager(emitter);
  }

  protected createProgramContext(fileName: string): Context {
    const options = this.emitter.getOptions();
    const resolvedFileName = options["output-file"] ?? fileName;
    const sourceFile = this.emitter.createSourceFile(resolvedFileName);
    return {
      scope: sourceFile.globalScope,
    };
  }

  protected createNamespaceContext(namespace: Namespace, fileName: string): Context {
    if (namespace.name === "TypeSpec") {
      return {};
    }
    const file = this.emitter.createSourceFile(this.buildFilePath(namespace, fileName));
    return {
      scope: file.globalScope,
    };
  }

  /** Constructs a file system path for a given namespace. If a fileName is provided,
   * the path will be to a file. Otherwise, the path will be to the folder.
   */
  buildFilePath(namespace: Namespace, fileName?: string): string {
    const fullPath = getNamespaceFullName(namespace)
      .split(".")
      .map((seg) => this.toSnakeCase(seg))
      .join("/");
    if (fileName !== undefined) {
      return `${fullPath}/${fileName}`;
    } else {
      return fullPath;
    }
  }

  /** Convert a TypeSpec scalar name to the relevant Python equivalent. */
  convertScalarName(scalar: Scalar, name: string | undefined): string {
    const builtInPythonTypes = [
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

    const scalarName = name ?? scalar.name;
    const isBuiltIn = builtInPythonTypes.includes(scalarName);
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
        this.imports.add("datetime", "timedelta", ImportKind.regular);
        return "timedelta";
      case "offsetDateTime":
        return "str";
      case "numeric":
      case "decimal":
      case "decimal128":
        this.imports.add("decimal", "Decimal", ImportKind.regular);
        return "Decimal";
      case "plainDate":
        this.imports.add("datetime", "date", ImportKind.regular);
        return "date";
      case "plainTime":
        this.imports.add("datetime", "time", ImportKind.regular);
        return "time";
      case "utcDateTime":
        this.imports.add("datetime", "datetime", ImportKind.regular);
        return "datetime";
      case "object":
      case "unknown":
        return "object";
      default:
        if (isBuiltIn) {
          return scalarName;
        }
        return this.toPascalCase(scalarName);
    }
  }

  /** Returns an indentation string in 4 character increments. */
  indent(count: number = 1) {
    const pythonIndent = "    ";
    let val = "";
    for (let i = 0; i < count; i++) {
      val += pythonIndent;
    }
    return val;
  }

  /** Returns the most base scalar for a given scalar. */
  getBaseScalar(type: Scalar): Scalar {
    if (type.baseScalar !== undefined) {
      return this.getBaseScalar(type.baseScalar);
    }
    return type;
  }

  /** Returns whether a TypeSpec type is a literal */
  isLiteral(type: Type): boolean {
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

  /** Converts camelCase name to snake_case. */
  toSnakeCase(name: string): string {
    const value = name.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (value.startsWith("_")) {
      return value.substring(1);
    }
    return value;
  }

  /** Converts camelCase or snake_case name to PascalCase. */
  toPascalCase(name: string): string {
    let value = name;
    // convert snake case to pascal case
    if (name.includes("_")) {
      const words = name.split("_");
      value = words.map((word) => word[0].toUpperCase() + word.substring(1)).join("");
    }
    // ensure first letter is capitalized
    return value[0].toUpperCase() + value.substring(1);
  }

  /** Transforms names that start with numbers or are reserved keywords. */
  transformReservedName(name: string): string {
    const reservedPythonKeywords = [
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

    if (reservedPythonKeywords.includes(name)) {
      return `${name}_`;
    } else if (name.match(/^\d/)) {
      return `_${name}`;
    }
    return name;
  }

  /** Locates a descriminator on a given type by iterating through the type graph. */
  findDiscriminator(type: Type): string | undefined {
    const program = this.emitter.getProgram();
    if (type.kind === "Union") {
      return getDiscriminator(program, type)?.propertyName;
    } else if (type.kind === "Model") {
      const discriminator = getDiscriminator(program, type);
      if (discriminator !== undefined) {
        return discriminator.propertyName;
      } else if (type.baseModel !== undefined) {
        return this.findDiscriminator(type.baseModel);
      }
    }
    return undefined;
  }

  /** Matches __init__.py and models.py files together */
  matchSourceFiles(sourceFiles: SourceFile<string>[]): [SourceFile<string>, SourceFile<string>][] {
    const matchedFiles = new Map<string, SourceFile<string>[]>();
    for (const sf of sourceFiles) {
      const path = sf.path;
      const dir = path.substring(0, path.lastIndexOf("/"));
      const files = matchedFiles.get(dir) ?? [];
      // if this is an __init__.py file, add it to the end
      if (path.endsWith("__init__.py")) {
        files.push(sf);
      } else {
        // otherwise add it to the beginning
        files.unshift(sf);
      }
      matchedFiles.set(dir, files);
    }
    return [...matchedFiles.values()].map((files) => [files[0], files[1]]);
  }

  /** Emits an __init__.py file with the relevant import statements. */
  async emitInitFile(initFile: SourceFile<string>, modelFile: SourceFile<string>): Promise<EmittedSourceFile> {
    const initSf = await this.emitter.emitSourceFile(initFile);
    const models = modelFile.globalScope.declarations.map((decl) => decl.name);
    const builder = new StringBuilder();
    if (models.length > 0) {
      builder.push(code`from .models import ${[...models].join(", ")}\n`);
      const quoted = [...models].map((name) => `"${name}"`);
      builder.push(code`\n__all__ = [${[...quoted].join(", ")}]\n`);
    }
    initSf.contents = builder.reduce() + "\n" + initSf.contents;
    return initSf;
  }

  /** Construct a fully-qualified namespace string from a model. */
  buildNamespaceFromModel(model: Model | Scalar): string | undefined {
    if (model.namespace === undefined) return undefined;
    const fullNsName = getNamespaceFullName(model.namespace);
    return fullNsName
      .split(".")
      .map((seg) => this.toSnakeCase(seg))
      .join(".");
  }

  /** Construct a fully-qualified namespace string from a TypeSpec EmitterFramework scope. */
  buildNamespaceFromScope(dest: Scope<string>): string {
    if (dest.kind !== "sourceFile") {
      throw new Error("Expected a source file");
    }
    const outputDir = this.emitter.getOptions().emitterOutputDir;
    let destPath = dest.sourceFile.path;
    if (destPath.startsWith(outputDir)) {
      destPath = destPath.substring(outputDir.length);
    }
    if (destPath.startsWith("/")) {
      destPath = destPath.substring(1);
    }
    return destPath.split("/").slice(0, -1).join(".");
  }

  /** Accepts a path and returns the fully-qualified namespace */
  buildNamespaceFromPath(path: string): string | undefined {
    const segments = path.split("/");
    if (segments.length > 2) {
      return segments.slice(1, -1).join(".");
    } else {
      return undefined;
    }
  }

  /** Emits docs for a given type. */
  emitDocs(builder: StringBuilder, type: Type) {
    const program = this.emitter.getProgram();
    const docs = getDoc(program, type);
    if (docs === undefined) return;
    if (docs.split("\n").length > 1) {
      builder.push(code`${this.indent()}"""\n`);
      for (const line of docs.split("\n")) {
        builder.push(code`${this.indent()}${line}\n`);
      }
      builder.push(code`${this.indent()}"""\n`);
    } else {
      builder.push(code`${this.indent()}"""${docs}"""\n`);
    }
  }

  arrayLiteral(array: Model, elementType: Type): EmitterOutput<string> {
    this.imports.add("typing", "List");
    return code`List[${this.emitTypeReference(elementType)}]`;
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

  tupleLiteral(tuple: Tuple): EmitterOutput<string> {
    const builder = new StringBuilder();
    let i = 0;
    const length = tuple.values.length;
    this.imports.add("typing", "Tuple");
    builder.push(code`Tuple[`);
    for (const item of tuple.values) {
      builder.push(code`${this.emitTypeReference(item)}`);
      if (++i < length) builder.push(code`, `);
      else builder.push(code`]`);
    }
    return builder.reduce();
  }

  intrinsic(intrinsic: IntrinsicType, name: string): EmitterOutput<string> {
    switch (name) {
      case "never":
        // Unsupported: See `intrinsic-type-unsupported` rule
        return this.emitter.result.none();
      case "unknown":
        return code`object`;
      case "null":
      case "void":
        return code`None`;
      default:
        reportDiagnostic(this.emitter.getProgram(), {
          code: "unexpected-error",
          target: intrinsic,
        });
        return code`object`;
    }
  }

  unionLiteral(union: Union): EmitterOutput<string> {
    return this.emitter.emitUnionVariants(union);
  }

  /**
   * Returns a string representation of the union type. If all variants are literals
   * it will return only `Literal[...]`. If all variants are non-literals it will
   * return only `Union[...]`. If there are both literal and non-literal variants
   * the literals will be listed first (`Union[Literal[...], ...]`).
   */
  unionVariants(union: Union): EmitterOutput<string> {
    const builder = new StringBuilder();
    const literals: UnionVariantMetadata[] = [];
    const nonLiterals: UnionVariantMetadata[] = [];
    for (const variant of union.variants.values()) {
      const isLit = this.isLiteral(variant.type);
      if (isLit) {
        literals.push({
          type: variant.type,
          value: code`${this.emitTypeReference(variant.type)}`,
        });
      } else {
        // value is already represented in nonLiterals array, don't add it again
        const value = code`${this.emitTypeReference(variant.type)}`;
        if (nonLiterals.some((val) => val.value === value)) continue;
        nonLiterals.push({
          type: variant.type,
          value: value,
        });
      }
    }
    const hasLiterals = literals.length > 0;
    const hasNonLiterals = nonLiterals.length > 0;
    if (!hasLiterals && !hasNonLiterals) {
      reportDiagnostic(this.emitter.getProgram(), {
        code: "unexpected-error",
        target: union,
      });
    }
    if (hasNonLiterals) {
      this.imports.add("typing", "Union");
      builder.push(code`Union[`);
    }
    if (hasLiterals) {
      this.imports.add("typing", "Literal");
      builder.push(code`Literal[`);
      let i = 0;
      const length = literals.length;
      for (const val of literals) {
        builder.push(val.value);
        if (++i < length) builder.push(code`, `);
      }
      builder.push(code`]`);
    }
    if (hasNonLiterals) {
      let i = 0;
      const length = nonLiterals.length;
      if (hasLiterals) {
        builder.push(code`, `);
      }
      for (const val of nonLiterals) {
        builder.push(val.value);
        if (++i < length) builder.push(code`, `);
      }
      builder.push(code`]`);
    }
    return builder.reduce();
  }

  emitTypeReference(type: Type) {
    const sourceNs = this.currNamespace.slice(-1)[0];
    const destNs = this.buildNamespaceFromModel(type as Model);
    if (sourceNs !== destNs && destNs !== undefined && destNs !== "type_spec") {
      if (type.kind === "Model") {
        const templateArgs = type.templateMapper?.args;
        if (templateArgs === undefined || templateArgs.length === 0) {
          this.imports.add(destNs, type.name);
        }
      }
    }
    const value = this.emitter.emitTypeReference(type);
    if (value.kind === "code" && value.value instanceof Placeholder && (value.value as any).segments === undefined) {
      return code`"${value}"`;
    }
    return code`${value}`;
  }

  /** Matches __init__.py and models.py files together */
  #matchSourceFiles(sourceFiles: SourceFile<string>[]): [SourceFile<string>, SourceFile<string>][] {
    const matchedFiles = new Map<string, SourceFile<string>[]>();
    for (const sf of sourceFiles) {
      const path = sf.path;
      const dir = path.substring(0, path.lastIndexOf("/"));
      const files = matchedFiles.get(dir) ?? [];
      // if this is an __init__.py file, add it to the end
      if (path.endsWith("__init__.py")) {
        files.push(sf);
      } else {
        // otherwise add it to the beginning
        files.unshift(sf);
      }
      matchedFiles.set(dir, files);
    }
    return [...matchedFiles.values()].map((files) => [files[0], files[1]]);
  }

  /** Filters out declarations that should not actually be emitted. */
  #filterOmittedDeclarations(declarations: Declaration<string>[]): Declaration<string>[] {
    const filtered = declarations.filter((decl) => decl.meta["omit"] === false);
    return filtered;
  }

  async writeOutput(sourceFiles: SourceFile<string>[]): Promise<void> {
    const toEmit: EmittedSourceFile[] = [];

    const sortedFiles = this.#matchSourceFiles(sourceFiles);
    for (const [mainFile, initFile] of sortedFiles) {
      const mainSf = await this.emitter.emitSourceFile(mainFile);
      if (this.#filterOmittedDeclarations(mainFile.globalScope.declarations).length === 0) {
        continue;
      }
      toEmit.push(mainSf);
      if (initFile !== undefined) {
        toEmit.push(await this.emitInitFile(initFile, mainFile));
      }
    }

    if (!this.emitter.getProgram().compilerOptions.noEmit) {
      for (const emittedSf of toEmit) {
        await emitFile(this.emitter.getProgram(), {
          path: emittedSf.path,
          content: emittedSf.contents,
        });
      }
    }
  }

  abstract emitScalar(scalar: Scalar, name: string, sourceFile?: SourceFile<string>): string | Placeholder<string>;

  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    const builder = new StringBuilder();

    // render imports
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

    const preamble = sourceFile.meta["preamble"] ?? "";
    const emittedSourceFile: EmittedSourceFile = {
      path: sourceFile.path,
      contents: builder.reduce() + `${preamble}\n`,
    };

    for (const decl of sourceFile.globalScope.declarations) {
      if (decl.value === undefined || decl.value === "") continue;
      emittedSourceFile.contents += decl.value + "\n";
    }

    const sfNs = this.buildNamespaceFromPath(sourceFile.path) ?? "";

    // render deferred declarations
    const deferredDeclarations = this.declarations!.filter((decl) => decl.isDeferred && decl.omit === false);
    for (const item of deferredDeclarations) {
      // only render deferred declarations that are in relevant to the source file
      const itemNs = item.path.split(".").slice(0, -1).join(".");
      if (itemNs !== sfNs) continue;

      if (item.source?.kind === "Model") {
        const props = this.emitter.emitModelProperties(item.source);
        const modelCode = code`class ${item.name}(BaseModel):\n${props}`;
        emittedSourceFile.contents += modelCode + "\n\n";
      } else if (item.source?.kind === "Scalar") {
        const scalarCode = this.emitScalar(item.source, item.name, sourceFile);
        emittedSourceFile.contents += scalarCode + "\n\n";
      }
    }
    return emittedSourceFile;
  }

  /** Returns the asset emitter. */
  getAssetEmitter(): AssetEmitter<string, Record<string, never>> {
    return this.emitter;
  }
}

export abstract class PythonPartialModelEmitter extends PythonPartialEmitter {
  private fileName = "models.py";

  programContext(program: Program): Context {
    return this.createProgramContext(this.fileName);
  }

  namespaceContext(namespace: Namespace): Context {
    if (namespace.name === "TypeSpec") {
      return {};
    }
    this.emitter.createSourceFile(this.buildFilePath(namespace, "__init__.py"));
    return this.createNamespaceContext(namespace, this.fileName);
  }
}

export abstract class PythonPartialOperationEmitter extends PythonPartialEmitter {
  private fileName = "operations.py";

  programContext(program: Program): Context {
    return this.createProgramContext(this.fileName);
  }

  namespaceContext(namespace: Namespace): Context {
    return this.createNamespaceContext(namespace, this.fileName);
  }
}
