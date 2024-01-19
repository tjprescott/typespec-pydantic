import {
  IntrinsicType,
  Model,
  Scalar,
  Type,
  emitFile,
  getDiscriminator,
  getDoc,
  getNamespaceFullName,
} from "@typespec/compiler";
import {
  AssetEmitter,
  CodeTypeEmitter,
  Declaration,
  EmittedSourceFile,
  EmitterOutput,
  Scope,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { ImportManager, ImportKind } from "./import-util.js";
import { DeclarationManager, DeclarationManager2 } from "./declaration-util.js";
import { reportDiagnostic } from "./lib.js";

export class PythonPartialEmitter extends CodeTypeEmitter {
  protected imports: ImportManager;

  protected declarations: DeclarationManager;

  protected decls?: DeclarationManager2;

  constructor(emitter: AssetEmitter<string, Record<string, never>>) {
    super(emitter);
    this.imports = new ImportManager(emitter);
    this.declarations = new DeclarationManager(emitter);
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
  buildNamespaceFromModel(model: Model): string | undefined {
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
  #filterDeclarations(declarations: Declaration<string>[]): Declaration<string>[] {
    const filtered = declarations.filter((decl) => decl.meta["omit"] === false);
    return filtered;
  }

  async writeOutput(sourceFiles: SourceFile<string>[]): Promise<void> {
    const toEmit: EmittedSourceFile[] = [];

    const sortedFiles = this.#matchSourceFiles(sourceFiles);
    for (const [mainFile, initFile] of sortedFiles) {
      const mainSf = await this.emitter.emitSourceFile(mainFile);
      if (this.#filterDeclarations(mainFile.globalScope.declarations).length === 0) {
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
}
