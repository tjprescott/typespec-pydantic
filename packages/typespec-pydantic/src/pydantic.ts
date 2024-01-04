import {
  BooleanLiteral,
  EmitContext,
  Enum,
  EnumMember,
  Interface,
  IntrinsicType,
  Model,
  ModelProperty,
  Namespace,
  NumericLiteral,
  Operation,
  Program,
  Scalar,
  StringLiteral,
  Tuple,
  Type,
  Union,
  emitFile,
  getDiscriminator,
  getDoc,
  getKnownValues,
  getMaxLength,
  getMaxValue,
  getMaxValueExclusive,
  getMinLength,
  getMinValue,
  getMinValueExclusive,
  getNamespaceFullName,
  getPattern,
  getVisibility,
} from "@typespec/compiler";
import {
  CodeTypeEmitter,
  Context,
  EmitEntity,
  EmittedSourceFile,
  EmitterOutput,
  Placeholder,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { PydanticEmitterOptions, reportDiagnostic } from "./lib.js";
import { getFields } from "./decorators.js";
import { DeclarationManager } from "./declaration-util.js";

export async function $onEmit(context: EmitContext<PydanticEmitterOptions>) {
  const assetEmitter = context.getAssetEmitter(PydanticEmitter);

  assetEmitter.emitProgram({ emitTypeSpecNamespace: false });

  await assetEmitter.writeOutput();
}

interface UnionVariantMetadata {
  type: Type;
  value: string | StringBuilder;
}

/// Metadata for a Pydantic field.
interface PydanticFieldMetadata {
  [key: string]: string | StringBuilder | number | boolean | string[] | Type | undefined | null;
  // define a default value for a field.
  default?: Type | string | number | null;
  // define a callable that will be called to generate a default value.
  defaultFactory?: string;
  // whether the default value of the field should be validated. By default, it is not.
  validateDefault?: boolean;
  // description of the field
  description?: string | StringBuilder;
  // title of the field
  title?: string;
  // examples of the field
  examples?: string[];
  // extra JSON schema properties to be added to the field.
  jsonSchemaExtra?: string;
  // whether the field should be included in the string representation of the model.
  repr?: boolean;
  // define an alias for a field for both validation and serialization.
  alias?: string;
  // define an alias for a field for validation ONLY.
  validationAlias?: string;
  // define an alias for a field for serialization ONLY.
  serializationAlias?: string;
  // greater than
  gt?: number;
  // less than
  lt?: number;
  // greater than or equal to
  ge?: number;
  // less than or equal to
  le?: number;
  // multiple of the given number
  multipleOf?: number;
  // allow 'inf', '-inf' and 'nan' values.
  allowInfNan?: boolean;
  // minimum length of string
  minLength?: number;
  // maximum length of string
  maxLength?: number;
  // a regular expression that the string must match
  pattern?: string;
  // maximum number of digits within the Decimal. It does not include a zero before the decimal point or trailing decimal zeros.
  maxDigits?: number;
  // maximum number of decimal places allowed. It does not include trailing decimal zeroes.
  decimalPlaces?: number;
  // whether the field should be seen as init-only field in the dataclass.
  initVar?: boolean;
  // whether the field should be a keyword-only argument in the constructor of the dataclass.
  kwOnly?: boolean;
  // the field that will be used to discriminate between different models in a union.
  discriminator?: string;
  // whether the field should be validated in "strict mode".
  strict?: boolean;
  // prevent the field from being assigned a new value after the model is created (immutability).
  frozen?: boolean;
  // whether the field should be excluded from the model when exporting the model.
  exclude?: boolean;
}

class PydanticEmitter extends CodeTypeEmitter {
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

  #addImport(module: string, name: string) {
    const context = this.emitter.getContext();
    const scope = context.scope;
    if (scope === undefined) {
      // We should probably do something differently here, but for now just return.s
      return;
    }
    if (scope.kind === "sourceFile") {
      const sourceFile: SourceFile<string> = scope.sourceFile;
      const moduleImports = new Set(sourceFile.imports.get(module) ?? []);
      moduleImports.add(name);
      sourceFile.imports.set(module, [...moduleImports]);
    } else {
      throw new Error("Expected source file scope");
    }
  }

  #indent(count: number = 1) {
    let val = "";
    for (let i = 0; i < count; i++) {
      val += PydanticEmitter.pythonIndent;
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
    if (PydanticEmitter.reservedPythonKeywords.includes(name)) {
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

  #findDiscriminator(type: Type): string | undefined {
    if (type.kind === "Union") {
      return getDiscriminator(this.emitter.getProgram(), type)?.propertyName;
    } else if (type.kind === "Model") {
      const discriminator = getDiscriminator(this.emitter.getProgram(), type);
      if (discriminator !== undefined) {
        return discriminator.propertyName;
      } else if (type.baseModel !== undefined) {
        return this.#findDiscriminator(type.baseModel);
      }
    }
    return undefined;
  }

  #emitFieldValue(value: string | StringBuilder | number | boolean | Type | string[] | null): string | StringBuilder {
    if (typeof value === "boolean") {
      return value ? "True" : "False";
    } else if (typeof value === "string") {
      // if string already is quoted, don't quote it again
      if (value.startsWith('"') && value.endsWith('"')) {
        return value;
      } else {
        return `"${value}"`;
      }
    } else if (typeof value === "number") {
      return value.toString();
    } else if (value === null) {
      return code`None`;
    } else {
      return code`${this.emitter.emitTypeReference(value as Type)}`;
    }
  }

  #emitField(
    builder: StringBuilder,
    item: ModelProperty | EnumMember | Scalar,
    emitEquals: boolean = true,
    emitEmptyField: boolean = false,
  ): StringBuilder {
    const metadata: PydanticFieldMetadata = {};

    // gather metadata
    const doc = getDoc(this.emitter.getProgram(), item);
    const mergedLines = doc?.split("\n").join("\\n");
    metadata.description = mergedLines !== undefined ? code`"${mergedLines}"` : undefined;
    if (item.kind === "ModelProperty") {
      const isOptional = item.optional;
      if (item.default !== undefined) {
        metadata.default = item.default;
      } else if (isOptional) {
        metadata.default = null;
      }
    } else if (item.kind === "EnumMember") {
      metadata.default = item.value !== undefined ? item.value : this.#checkName(item.name);
      metadata.frozen = true;
    }

    // check for read-only properties
    const visibility = getVisibility(this.emitter.getProgram(), item);
    if (visibility !== undefined && visibility.length === 1 && visibility[0] === "read") {
      metadata.frozen = true;
    }

    // gather string metadata
    metadata.minLength = getMinLength(this.emitter.getProgram(), item);
    metadata.maxLength = getMaxLength(this.emitter.getProgram(), item);
    metadata.pattern = getPattern(this.emitter.getProgram(), item);

    // gather numeric metadata
    metadata.ge = getMinValue(this.emitter.getProgram(), item);
    metadata.gt = getMinValueExclusive(this.emitter.getProgram(), item);
    metadata.le = getMaxValue(this.emitter.getProgram(), item);
    metadata.lt = getMaxValueExclusive(this.emitter.getProgram(), item);

    // gather discriminator metadata
    if (item.kind === "ModelProperty") {
      const discriminator = this.#findDiscriminator(item.type);
      metadata.discriminator = discriminator !== undefined ? discriminator : undefined;
    } else {
      metadata.discriminator = undefined;
    }

    // TODO: completely unsupported metadata
    metadata.defaultFactory = undefined;
    metadata.examples = undefined;
    metadata.jsonSchemaExtra = undefined;

    // TODO: Supported with @field decorator
    metadata.validateDefault = undefined;
    metadata.title = undefined;
    metadata.repr = undefined;
    metadata.alias = undefined;
    metadata.validationAlias = undefined;
    metadata.serializationAlias = undefined;
    metadata.multipleOf = undefined;
    metadata.allowInfNan = undefined;
    metadata.maxDigits = undefined;
    metadata.decimalPlaces = undefined;
    metadata.initVar = undefined;
    metadata.kwOnly = undefined;
    metadata.strict = undefined;
    metadata.exclude = undefined;

    if (item.kind === "ModelProperty") {
      const fields = getFields(this.emitter.getProgram(), item);
      for (const field of fields ?? []) {
        metadata[field.key] = field.value;
      }
    }

    // delete any undefined values
    for (const [key, val] of Object.entries(metadata)) {
      if (val === undefined) {
        delete metadata[key];
      }
    }

    // don't emit anything if there is no metadata
    if (Object.keys(metadata).length === 0 && !emitEmptyField) return builder;

    // emit metadata
    if (emitEquals) {
      builder.push(code` = `);
    }
    this.#addImport("pydantic", "Field");
    builder.push(code`Field(`);
    let i = 0;
    const length = Object.keys(metadata).length;
    for (const [key, val] of Object.entries(metadata)) {
      if (val === undefined) continue;
      const pythonKey = this.#toSnakeCase(key);
      builder.push(code`${pythonKey}=${this.#emitFieldValue(val)}`);
      if (++i < length) builder.push(code`, `);
    }
    builder.push(code`)`);
    return builder;
  }

  programContext(program: Program): Context {
    const options = this.emitter.getOptions();
    const outFile = options["output-file"] ?? "models.py";
    const sourceFile = this.emitter.createSourceFile(outFile);
    return {
      scope: sourceFile.globalScope,
    };
  }

  /** Create a new source file for each namespace. */
  namespaceContext(namespace: Namespace): Context {
    this.emitter.createSourceFile(`__init__.py`);
    const fullName = getNamespaceFullName(namespace);
    const outputFile = this.emitter.createSourceFile(`${this.#toSnakeCase(namespace.name)}.py`);
    return {
      scope: outputFile.globalScope,
    };
  }

  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    const builder = new StringBuilder();
    for (const [moduleName, names] of sourceFile.imports.entries()) {
      builder.push(code`from ${moduleName} import ${[...names].join(", ")}\n`);
    }
    const emittedSourceFile: EmittedSourceFile = {
      path: sourceFile.path,
      contents: builder.reduce() + "\n",
    };

    if (sourceFile.globalScope.declarations.length === 0) {
      emittedSourceFile.contents = "";
      return emittedSourceFile;
    }

    for (const decl of sourceFile.globalScope.declarations) {
      emittedSourceFile.contents += decl.value + "\n\n";
    }

    for (const [name, item] of this.declarations.getDeferred()) {
      if (item.kind === "Model") {
        this.#addImport("pydantic", "BaseModel");
        const props = this.emitter.emitModelProperties(item);
        const modelCode = code`class ${name}(BaseModel):\n${props}`;
        emittedSourceFile.contents += modelCode + "\n\n";
      } else if (item.kind === "Scalar") {
        const scalarCode = this.#emitScalar(item, name);
        emittedSourceFile.contents += scalarCode + "\n\n";
      }
    }
    return emittedSourceFile;
  }

  async writeOutput(sourceFiles: SourceFile<string>[]): Promise<void> {
    const toEmit: EmittedSourceFile[] = [];

    for (const sf of sourceFiles) {
      const emittedSf = await this.emitter.emitSourceFile(sf);

      if (sf.globalScope.declarations.length > 0 || sf.path.endsWith("__init__.py")) {
        toEmit.push(emittedSf);
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

  #emitDocs(builder: StringBuilder, type: Type) {
    const docs = getDoc(this.emitter.getProgram(), type);
    if (docs === undefined) return;
    if (docs.split("\n").length > 1) {
      builder.push(code`${this.#indent()}"""\n`);
      for (const line of docs.split("\n")) {
        builder.push(code`${this.#indent()}${line}\n`);
      }
      builder.push(code`${this.#indent()}"""\n`);
    } else {
      builder.push(code`${this.#indent()}"""${docs}"""\n`);
    }
  }

  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    const props = this.emitter.emitModelProperties(model);
    const builder = new StringBuilder();
    const baseModel = model.baseModel?.name ?? "BaseModel";
    if (baseModel === "BaseModel") {
      this.#addImport("pydantic", "BaseModel");
    }
    builder.push(code`class ${name}(${baseModel}):\n`);
    this.#emitDocs(builder, model);
    if ([...model.properties.values()].length > 0) {
      builder.push(code`${props}`);
    } else {
      builder.push(code`${this.#indent()}pass`);
    }
    return this.#declare(name, builder.reduce());
  }

  modelLiteral(model: Model): EmitterOutput<string> {
    // Unsupported. See: `anonymous-model` rule
    return code`object`;
  }

  modelInstantiation(model: Model, name: string | undefined): EmitterOutput<string> {
    if (model.name === "Record") {
      const type = model.templateMapper?.args[0];
      this.#addImport("typing", "Dict");
      return code`Dict[str, ${type ? this.emitter.emitTypeReference(type) : "None"}]`;
    } else {
      const modelName = this.#checkName(name ?? model.name);
      if (this.#isDeclared(modelName)) {
        return code`${modelName}`;
      } else {
        this.declarations.defer(modelName, model);
        return code`"${modelName}"`;
      }
    }
  }

  modelProperties(model: Model): EmitterOutput<string> {
    const builder = new StringBuilder();
    for (const prop of model.properties.values()) {
      builder.push(code`${this.#indent()}${this.emitter.emitModelProperty(prop)}\n`);
    }
    return this.emitter.result.rawCode(builder.reduce());
  }

  modelPropertyLiteral(property: ModelProperty): EmitterOutput<string> {
    const builder = new StringBuilder();
    const isOptional = property.optional;
    const knownValues = getKnownValues(this.emitter.getProgram(), property);
    let type: EmitEntity<string> | undefined = undefined;
    type = this.emitter.emitTypeReference(property.type);
    // don't emit anything if type is `never`
    if (property.type.kind === "Intrinsic" && property.type.name === "never") return code``;

    const isLiteral = this.#isLiteral(property.type);
    builder.push(code`${this.#checkName(this.#toSnakeCase(property.name))}: `);
    if (isOptional) {
      this.#addImport("typing", "Optional");
      builder.push(code`Optional[`);
    }
    if (isLiteral) {
      this.#addImport("typing", "Literal");
      builder.push(code`Literal[`);
    }
    if (property.type.kind === "Union") {
      builder.push(code`${this.emitter.emitUnionVariants(property.type)}`);
    } else if (property.type.kind === "UnionVariant") {
      builder.push(code`${this.emitter.emitTypeReference(property.type.type)}`);
    } else if (property.type.kind === "Scalar" && knownValues !== undefined) {
      builder.push(code`Union[${type}, ${knownValues.name}]`);
    } else {
      builder.push(code`${type}`);
    }
    if (isLiteral) {
      builder.push(code`]`);
    }
    if (isOptional) {
      builder.push(code`]`);
    }
    this.#emitField(builder, property);
    builder.push(code`\n`);
    this.#emitDocs(builder, property);
    return builder.reduce();
  }

  modelPropertyReference(property: ModelProperty): EmitterOutput<string> {
    return code`${this.emitter.emitTypeReference(property.type)}`;
  }

  enumDeclaration(en: Enum, name: string): EmitterOutput<string> {
    const members = this.emitter.emitEnumMembers(en);
    const builder = new StringBuilder();
    this.#addImport("enum", "Enum");
    builder.push(code`class ${name}(Enum):\n`);
    this.#emitDocs(builder, en);
    builder.push(code`${members}`);
    return this.#declare(name, builder.reduce());
  }

  enumMembers(en: Enum): EmitterOutput<string> {
    const builder = new StringBuilder();
    for (const member of en.members.values()) {
      builder.push(code`${this.#indent()}${this.emitter.emitType(member)}\n`);
    }
    return this.emitter.result.rawCode(builder.reduce());
  }

  enumMember(member: EnumMember): EmitterOutput<string> {
    const builder = new StringBuilder();
    builder.push(code`${this.#toSnakeCase(member.name).toUpperCase()}`);
    this.#emitField(builder, member);
    builder.push(code`\n`);
    this.#emitDocs(builder, member);
    return builder.reduce();
  }

  enumMemberReference(member: EnumMember): EmitterOutput<string> {
    this.#addImport("typing", "Literal");
    return code`Literal[${member.enum.name}.${this.#toSnakeCase(member.name).toUpperCase()}]`;
  }

  arrayDeclaration(array: Model, name: string, elementType: Type): EmitterOutput<string> {
    const builder = new StringBuilder();
    this.#addImport("pydantic", "RootModel");
    this.#addImport("typing", "List");
    builder.push(code`class ${name}(RootModel):\n`);
    builder.push(code`${this.#indent()}root: List[${this.emitter.emitTypeReference(elementType)}]\n\n`);
    builder.push(code`${this.#indent()}def __iter__(self):\n${this.#indent(2)}return iter(self.root)\n\n`);
    builder.push(code`${this.#indent()}def __getitem__(self, item):\n${this.#indent(2)}return self.root[item]\n\n`);
    return this.#declare(name, builder.reduce());
  }

  arrayLiteral(array: Model, elementType: Type): EmitterOutput<string> {
    this.#addImport("typing", "List");
    return code`List[${this.emitter.emitTypeReference(elementType)}]`;
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

  #convertScalarName(scalar: Scalar, name: string | undefined): string {
    const scalarName = name ?? scalar.name;
    const isBuiltIn = PydanticEmitter.builtInPythonTypes.includes(scalarName);
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
    const knownValues = getKnownValues(this.emitter.getProgram(), scalar);
    const builder = new StringBuilder();
    const baseScalarName = this.#convertScalarName(this.#getBaseScalar(scalar), undefined);
    this.#addImport("typing", "Annotated");
    builder.push(code`${this.#checkName(this.#toPascalCase(name))} = Annotated[`);
    if (knownValues !== undefined) {
      builder.push(code`Union[${baseScalarName}, ${knownValues.name}], `);
    } else {
      builder.push(code`${baseScalarName}, `);
    }

    this.#emitField(builder, scalar, false, true);
    builder.push(code`]`);
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
    const converted = this.#convertScalarName(scalar, name);
    if (this.#isDeclared(converted)) {
      return code`${converted}`;
    } else {
      this.declarations.defer(converted, scalar);
      return code`"${converted}"`;
    }
  }

  operationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    // Operations not supported
    return this.emitter.result.none();
  }

  operationReturnType(operation: Operation, returnType: Type): EmitterOutput<string> {
    // Operations not supported
    return this.emitter.result.none();
  }

  interfaceDeclaration(iface: Interface, name: string): EmitterOutput<string> {
    // Operation interfaces not supported
    return this.emitter.result.none();
  }

  interfaceOperationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    // Operation interfaces not supported
    return this.emitter.result.none();
  }

  tupleLiteral(tuple: Tuple): EmitterOutput<string> {
    const builder = new StringBuilder();
    let i = 0;
    const length = tuple.values.length;
    this.#addImport("typing", "Tuple");
    builder.push(code`Tuple[`);
    for (const item of tuple.values) {
      builder.push(code`${this.emitter.emitTypeReference(item)}`);
      if (++i < length) builder.push(code`, `);
      else builder.push(code`]`);
    }
    return builder.reduce();
  }

  unionDeclaration(union: Union, name: string): EmitterOutput<string> {
    return this.#declare(name, undefined);
  }

  unionInstantiation(union: Union, name: string): EmitterOutput<string> {
    return this.emitter.emitUnionVariants(union);
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
      const isLiteral = this.#isLiteral(variant.type);
      if (isLiteral) {
        literals.push({
          type: variant.type,
          value: code`${this.emitter.emitTypeReference(variant.type)}`,
        });
      } else {
        // value is already represented in nonLiterals array, don't add it again
        const value = code`${this.emitter.emitTypeReference(variant.type)}`;
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
      this.#addImport("typing", "Union");
      builder.push(code`Union[`);
    }
    if (hasLiterals) {
      this.#addImport("typing", "Literal");
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
}
