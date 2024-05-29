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
  getService,
} from "@typespec/compiler";
import {
  AssetEmitter,
  CodeTypeEmitter,
  Context,
  Declaration,
  EmitEntity,
  EmittedSourceFile,
  EmitterOutput,
  NoEmit,
  Placeholder,
  RawCode,
  ReferenceCycle,
  Scope,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { ImportManager, ImportKind } from "./import-util.js";
import { DeclarationKind, DeclarationManager } from "./declaration-util.js";
import { reportDiagnostic } from "./lib.js";

interface UnionVariantMetadata {
  type: Type;
  value: string | StringBuilder;
}

interface FilePair {
  model?: SourceFile<string>;
  operation?: SourceFile<string>;
}

export enum EmitMode {
  Namespace,
  Program,
}

export const GlobalNamespace = Symbol.for("GlobalNamespace");

export abstract class PythonPartialEmitter extends CodeTypeEmitter {
  protected imports: ImportManager;

  public declarations?: DeclarationManager;

  public mode: EmitMode = EmitMode.Program;

  constructor(emitter: AssetEmitter<string, Record<string, never>>) {
    super(emitter);
    this.imports = new ImportManager(emitter);
  }

  protected createProgramContext(fileName: string): Context {
    const options = this.emitter.getOptions();
    const resolvedFileName = options["output-file"] ?? fileName;
    const sourceFile = this.emitter.createSourceFile(resolvedFileName);
    sourceFile.meta["kind"] = "program";
    return {
      scope: sourceFile.globalScope,
    };
  }

  public isInServiceNamespace(namespace: Namespace): boolean {
    if (getService(this.getProgram(), namespace) !== undefined) {
      return true;
    } else if (namespace.namespace !== undefined) {
      return this.isInServiceNamespace(namespace.namespace);
    }
    return false;
  }

  protected createNamespaceContext(namespace: Namespace, fileName: string): Context {
    // only create namespace context when the namespace is part of the service
    const omitAll = !this.isInServiceNamespace(namespace);
    if (!omitAll) {
      this.mode = EmitMode.Namespace;
    }
    const file = this.emitter.createSourceFile(this.buildFilePath(namespace, fileName));
    file.meta["omitAll"] = omitAll;
    file.meta["kind"] = "namespace";
    return {
      scope: file.globalScope,
      omitAll: omitAll,
    };
  }

  /** Matches models.py and operations.py files */
  matchSourceFiles(modelFiles: SourceFile<string>[], operationFiles: SourceFile<string>[]): Map<string, FilePair> {
    // remove omitted files
    const nonOmittedFiles = [...modelFiles, ...operationFiles].filter((sf) => sf.meta["omitAll"] === false);
    const matchedFiles = new Map<string, FilePair>();
    for (const sf of nonOmittedFiles) {
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

  async buildInitFile(map: Map<string, SourceFile<string>>): Promise<EmittedSourceFile | undefined> {
    // ensure that all paths have the same root path
    const rootPaths = [...map.keys()].map((path) => path.split("/").slice(0, -1).join("/"));
    const areAllPathsEqual = rootPaths.every((path) => path === rootPaths[0]);
    if (!areAllPathsEqual) {
      throw new Error("All paths must have the same root path");
    }

    // create a shallow copy of the map to avoid modifying the original
    const sourceFiles = [...map.values()];

    // createSourceFile prepends emitterOutputDir to the path, so remove it, if present.
    let rootPath = rootPaths[0];
    const emitterOutputDir = this.emitter.getOptions().emitterOutputDir;
    if (rootPath.startsWith(emitterOutputDir)) {
      rootPath = rootPath.substring(emitterOutputDir.length + 1);
    }
    const initPath = rootPath !== "" ? `${rootPath}/__init__.py` : "__init__.py";

    const initFile = this.emitter.createSourceFile(initPath);
    const initSf = await this.emitter.emitSourceFile(initFile);
    const builder = new StringBuilder();
    const all = new Set<string>();

    for (const sf of sourceFiles) {
      const decls = this.declarations?.get({
        sourceFile: sf,
      });
      if (decls === undefined || decls.length === 0) continue;
      const declNames = decls.map((decl) => decl.name);
      const refDecl = decls[0];
      if (refDecl.importPath === GlobalNamespace) {
        builder.push(`from ${refDecl.globalImportPath} import ${declNames.join(", ")}\n`);
      } else {
        // __init__ files are special in that we need this syntax to ensure the final part is needed generally
        builder.push(`from ${refDecl.importPath}.${refDecl.globalImportPath} import ${declNames.join(", ")}\n`);
      }
      for (const decl of declNames) {
        all.add(`"${decl}"`);
      }
    }
    if (all.size > 0) {
      builder.push(`\n__all__ = [${[...all].join(", ")}]`);
      initSf.contents = builder.reduce() + "\n";
    } else {
      initSf.contents = "";
    }
    return initSf;
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

  /** Construct a fully-qualified import path string from a namespace */
  importPathForNamespace(namespace: Namespace | undefined): string | typeof GlobalNamespace {
    if (namespace === undefined) return GlobalNamespace;
    const fullNsName = getNamespaceFullName(namespace)
      .split(".")
      .map((seg) => this.toSnakeCase(seg))
      .join(".");
    return fullNsName === "" ? GlobalNamespace : fullNsName;
  }

  /** Construct a fully-qualified import path string from a file path */
  importPathForFilePath(path: string | undefined): string | typeof GlobalNamespace | undefined {
    if (path === undefined) return undefined;
    const emitterOutputDir = this.emitter.getOptions().emitterOutputDir;
    if (path.startsWith(emitterOutputDir)) {
      path = path.substring(emitterOutputDir.length + 1);
    }
    let val = path
      .split("/")
      .map((seg) => this.toSnakeCase(seg))
      .join(".");
    // strip the final ".py"
    val = val.substring(0, val.length - 3);
    return val === "" ? GlobalNamespace : val;
  }

  /** Construct a fully-qualified namespace string from a TypeSpec EmitterFramework scope. */
  buildNamespaceFromScope(dest: Scope<string>): string | typeof GlobalNamespace {
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
    destPath = destPath.split("/").slice(0, -1).join(".");
    return destPath === "" ? GlobalNamespace : destPath;
  }

  /** Accepts a path and returns the fully-qualified namespace */
  buildNamespaceFromPath(path: string): string | typeof GlobalNamespace | undefined {
    const segments = path.split("/");
    if (segments.length > 2) {
      return segments.slice(1, -1).join(".");
    } else {
      return GlobalNamespace;
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
    console.log(`arrayLiteral: ${array.name}`);
    this.imports.add("typing", "List");
    return code`List[${this.emitTypeReference(elementType)}]`;
  }

  booleanLiteral(boolean: BooleanLiteral): EmitterOutput<string> {
    console.log(`booleanLiteral: ${boolean.value}`);
    const val = boolean.value ? "True" : "False";
    return code`${val}`;
  }

  numericLiteral(number: NumericLiteral): EmitterOutput<string> {
    console.log(`numericLiteral: ${number.value}`);
    return code`${number.value.toString()}`;
  }

  stringLiteral(string: StringLiteral): EmitterOutput<string> {
    console.log(`stringLiteral: ${string.value}`);
    return code`"${string.value}"`;
  }

  tupleLiteral(tuple: Tuple): EmitterOutput<string> {
    console.log(`tupleLiteral: ${tuple}`);
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
    console.log(`intrinsic: ${name}`);
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
    console.log(`unionLiteral: ${union.name ?? "anonymous"}`);
    return this.emitter.emitUnionVariants(union);
  }

  /**
   * Returns a string representation of the union type. If all variants are literals
   * it will return only `Literal[...]`. If all variants are non-literals it will
   * return only `Union[...]`. If there are both literal and non-literal variants
   * the literals will be listed first (`Union[Literal[...], ...]`).
   */
  unionVariants(union: Union): EmitterOutput<string> {
    console.log(`unionVariants: ${union.name ?? "anonymous"}`);
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
    const destNs = this.importPathForNamespace((type as Model).namespace);
    if (destNs !== "type_spec") {
      if (type.kind === "Model") {
        const templateArgs = type.templateMapper?.args;
        if (templateArgs === undefined || templateArgs.length === 0) {
          this.imports.add(destNs === GlobalNamespace ? "models" : destNs, type.name);
        }
      }
    }
    const value = this.emitter.emitTypeReference(type);
    if (value.kind === "code" && value.value instanceof Placeholder && (value.value as any).segments === undefined) {
      return code`"${value}"`;
    }
    return code`${value}`;
  }

  async writeOutput(sourceFiles: SourceFile<string>[]): Promise<void> {
    const toEmit: EmittedSourceFile[] = [];
    for (const file of sourceFiles) {
      // don't emit empty files
      const decls = this.declarations!.get({ kind: DeclarationKind.Model, sourceFile: file });
      if (decls.length === 0) continue;

      const mainSf = await this.emitter.emitSourceFile(file);
      toEmit.push(mainSf);
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

  /** Builds the structure of a Python source file but does not write the file to disk. */
  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    const builder = new StringBuilder();

    // render imports
    const fileImports = this.imports.get(sourceFile, ImportKind.regular);
    for (const [moduleName, metadata] of fileImports) {
      const names = Array.from(metadata).map((meta) => meta.name);
      builder.push(code`from ${moduleName} import ${[...names].join(", ")}\n`);
    }

    const deferredImports = this.imports.get(sourceFile, ImportKind.deferred);
    if (deferredImports.size > 0) {
      builder.push(code`\nif TYPE_CHECKING:\n`);
      for (const [moduleName, metadata] of deferredImports) {
        const names = Array.from(metadata).map((meta) => meta.name);
        builder.push(code`${this.indent()}from ${moduleName} import ${[...names].join(", ")}\n`);
      }
    }

    const preamble = sourceFile.meta["preamble"] ?? "";
    const emittedSourceFile: EmittedSourceFile = {
      path: sourceFile.path,
      contents: builder.reduce() + `${preamble}\n`,
    };

    for (const decl of this.declarations!.get({ sourceFile: sourceFile })) {
      if (decl.decl === undefined || decl.decl.value === "") continue;
      emittedSourceFile.contents += decl.decl.value + "\n";
    }
    return emittedSourceFile;
  }

  circularReference(
    target: EmitEntity<string>,
    scope: Scope<string> | undefined,
    cycle: ReferenceCycle,
  ): string | EmitEntity<string> {
    console.log(`python.ts circularReference: ${target}`);
    if (scope?.kind === "sourceFile" && target.kind === "declaration") {
      const targetName = target.name;
      const targetPath = this.buildNamespaceFromScope(target.scope);
      const sourcePath = this.buildNamespaceFromScope(scope);
      if (targetPath !== sourcePath) {
        this.imports.add("typing", "TYPE_CHECKING");
        this.imports.add(targetPath === GlobalNamespace ? "models" : targetPath, targetName, ImportKind.deferred);
      }
    }
    return super.circularReference(target, scope, cycle);
  }

  /** Helper method to get the Program instance from the underlying asset emitter. */
  getProgram(): Program {
    return this.emitter.getProgram();
  }

  /** Helper method to call `emitProgram` on the underlying asset emitter. */
  emitProgram(options?: { emitTypeSpecNamespace?: boolean }): void {
    this.emitter.emitProgram(options);
  }

  /** Helper method to get the SourceFiles from the underlying asset emitter. Returns
   * a shallow copy of the SourceFiles array to prevent mutation.
   */
  getSourceFiles(): SourceFile<string>[] {
    const allSourceFiles = [...this.emitter.getSourceFiles()];
    switch (this.mode) {
      case EmitMode.Program:
        return allSourceFiles.filter((sf) => sf.meta["kind"] === "program");
      case EmitMode.Namespace:
        return allSourceFiles.filter((sf) => sf.meta["omitAll"] === false && sf.meta["kind"] === "namespace");
      default:
        throw new Error("Unknown emit mode");
    }
  }

  /** Returns the current source file context, or undefined. */
  getSourceFile(): SourceFile<string> | undefined {
    const scope = this.emitter.getContext().scope;
    if (scope !== undefined && scope.kind === "sourceFile") {
      return scope.sourceFile;
    }
    return undefined;
  }

  /** Helper method to call writeOutput on the underlying asset emitter. */
  writeAllOutput(): Promise<void> {
    return this.emitter.writeOutput();
  }

  /** Helper method to call declaration from the underlying asset emitter. */
  declaration(name: string, value: string | Placeholder<string>): Declaration<string> {
    return this.emitter.result.declaration(name, value);
  }

  /** Helper method to call rawCode from the underlying asset emitter. */
  rawCode(value: string | Placeholder<string>): RawCode<string> {
    return this.emitter.result.rawCode(value);
  }

  /** Helper method to call none from the underlying asset emitter. */
  skip(): NoEmit {
    return this.emitter.result.none();
  }

  /** Helper method to get the context. */
  getContext(): Context {
    return this.emitter.getContext();
  }

  /** Return the asset emitter so you can call any methods. */
  getAssetEmitter(): AssetEmitter<string, Record<string, never>> {
    return this.emitter;
  }
}
