import {
  BooleanLiteral,
  Declaration,
  EmitContext,
  Enum,
  EnumMember,
  Interface,
  IntrinsicType,
  Model,
  ModelProperty,
  NumericLiteral,
  Operation,
  Program,
  Scalar,
  StringLiteral,
  Tuple,
  Type,
  Union,
  UnionVariant,
  getDoc,
  getMaxLength,
  getMaxValue,
  getMaxValueExclusive,
  getMinLength,
  getMinValue,
  getMinValueExclusive,
  getPattern,
  isIntrinsicType,
} from "@typespec/compiler";
import {
  CodeTypeEmitter,
  Context,
  EmitEntity,
  EmittedSourceFile,
  EmitterOutput,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { PydanticEmitterOptions, reportDiagnostic } from "./lib.js";

export async function $onEmit(context: EmitContext<PydanticEmitterOptions>) {
  const assetEmitter = context.getAssetEmitter(PydanticEmitter);

  assetEmitter.emitProgram();

  await assetEmitter.writeOutput();
}

interface UnionVariantMetadata {
  type: Type;
  value: string | StringBuilder;
}

/// Metadata for a Pydantic field.
interface PydanticFieldMetadata {
  [key: string]: string | StringBuilder | number | boolean | string[] | Type | undefined;
  // define a default value for a field.
  default?: Type | string | number;
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
  // TODO: Imports should be handled dynamically
  static readonly pydanticHeader = `from pydantic import *\nfrom typing import *\nfrom datetime import *\nfrom decimal import *\nfrom enum import Enum`;

  static readonly reservedKeywords = [
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

  private declaredType = new Set<string>();

  private deferredModels = new Map<string, Model>();

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
    return name.replace(/([A-Z])/g, "_$1").toLowerCase();
  }

  /// Transforms names that start with numbers or are reserved keywords.
  #checkName(name: string): string {
    if (PydanticEmitter.reservedKeywords.includes(name)) {
      return `${name}_`;
    } else if (name.match(/^\d/)) {
      return `_${name}`;
    }
    return name;
  }

  #isDeclared(name: string): boolean {
    return this.declaredType.has(name);
  }

  #declare(name: string, value: string | StringBuilder | undefined) {
    this.declaredType.add(name);
    return this.emitter.result.declaration(name, value ?? "");
  }

  #emitFieldValue(value: string | StringBuilder | number | boolean | Type | string[]): string | StringBuilder {
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
    } else {
      return code`${this.emitter.emitTypeReference(value as Type)}`;
    }
  }

  #emitField(builder: StringBuilder, item: ModelProperty | EnumMember): StringBuilder {
    const metadata: PydanticFieldMetadata = {};

    // gather metadata
    const doc = getDoc(this.emitter.getProgram(), item);
    metadata.description = doc !== undefined ? code`"${doc}"` : undefined;
    if (item.kind === "ModelProperty") {
      if (item.default !== undefined) {
        metadata.default = item.default;
      }
    } else if (item.kind === "EnumMember") {
      metadata.default = item.value !== undefined ? item.value : this.#checkName(item.name);
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

    // TODO: unsupported metadata
    metadata.defaultFactory = undefined;
    metadata.validateDefault = undefined;
    metadata.title = undefined;
    metadata.examples = undefined;
    metadata.jsonSchemaExtra = undefined;
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
    metadata.discriminator = undefined;
    metadata.strict = undefined;
    metadata.exclude = undefined;

    // delete any undefined values
    for (const [key, val] of Object.entries(metadata)) {
      if (val === undefined) {
        delete metadata[key];
      }
    }

    // don't emit anything if there is no metadata
    if (Object.keys(metadata).length === 0) return builder;

    // emit metadata
    builder.push(code` = Field(`);
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

  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    const emittedSourceFile: EmittedSourceFile = {
      path: sourceFile.path,
      contents: PydanticEmitter.pydanticHeader + "\n\n",
    };

    for (const decl of sourceFile.globalScope.declarations) {
      emittedSourceFile.contents += decl.value + "\n\n";
    }

    for (const [name, model] of this.deferredModels) {
      const props = this.emitter.emitModelProperties(model);
      const modelCode = code`class ${name}(BaseModel):\n${props}`;
      emittedSourceFile.contents += modelCode + "\n\n";
    }

    return emittedSourceFile;
  }

  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    const props = this.emitter.emitModelProperties(model);
    const docs = getDoc(this.emitter.getProgram(), model);
    const builder = new StringBuilder();
    builder.push(code`class ${name}(BaseModel):\n`);
    if (docs !== undefined) {
      builder.push(code`${this.#indent()}"""${docs}"""\n`);
    }
    builder.push(code`${props}`);
    return this.#declare(name, builder.reduce());
  }

  modelLiteral(model: Model): EmitterOutput<string> {
    const program = this.emitter.getProgram();
    reportDiagnostic(program, {
      code: "anonymous-model",
      target: model,
    });
    return code`object`;
  }

  modelInstantiation(model: Model, name: string | undefined): EmitterOutput<string> {
    if (model.name === "Record") {
      const type = model.templateMapper?.args[0];
      return code`Dict[str, ${type ? this.emitter.emitTypeReference(type) : "None"}]`;
    } else {
      const modelName = this.#checkName(name ?? model.name);
      if (this.#isDeclared(modelName)) {
        return code`${modelName}`;
      } else {
        this.deferredModels.set(modelName, model);
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
    ``;
    let type: EmitEntity<string> | undefined = undefined;
    type = this.emitter.emitTypeReference(property.type);
    // don't emit anything if type is `never`
    if (property.type.kind === "Intrinsic" && property.type.name === "never") return code``;

    const isLiteral = this.#isLiteral(property.type);
    builder.push(code`${this.#toSnakeCase(this.#checkName(property.name))}: `);
    if (isOptional) {
      builder.push(code`Optional[`);
    }
    if (isLiteral) {
      builder.push(code`Literal[`);
    }
    if (property.type.kind === "Union") {
      builder.push(code`${this.emitter.emitUnionVariants(property.type)}`);
    } else if (property.type.kind === "UnionVariant") {
      builder.push(code`${this.emitter.emitTypeReference(property.type.type)}`);
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
    return builder.reduce();
  }

  modelPropertyReference(property: ModelProperty): EmitterOutput<string> {
    return code`${this.emitter.emitTypeReference(property.type)}`;
  }

  enumDeclaration(en: Enum, name: string): EmitterOutput<string> {
    const members = this.emitter.emitEnumMembers(en);
    const builder = new StringBuilder();
    const docs = getDoc(this.emitter.getProgram(), en);
    builder.push(code`class ${name}(Enum):\n`);
    if (docs !== undefined) {
      builder.push(code`${this.#indent()}"""${docs}"""\n`);
    }
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
    return builder.reduce();
  }

  enumMemberReference(member: EnumMember): EmitterOutput<string> {
    return code`Literal[${member.enum.name}.${this.#toSnakeCase(member.name).toUpperCase()}]`;
  }

  arrayDeclaration(array: Model, name: string, elementType: Type): EmitterOutput<string> {
    const builder = new StringBuilder();
    builder.push(code`class ${name}(RootModel):\n`);
    builder.push(code`${this.#indent()}root: List[${this.emitter.emitTypeReference(elementType)}]\n\n`);
    builder.push(code`${this.#indent()}def __iter__(self):\n${this.#indent(2)}return iter(self.root)\n\n`);
    builder.push(code`${this.#indent()}def __getitem__(self, item):\n${this.#indent(2)}return self.root[item]\n\n`);
    return this.#declare(name, builder.reduce());
  }

  arrayLiteral(array: Model, elementType: Type): EmitterOutput<string> {
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
        reportDiagnostic(this.emitter.getProgram(), {
          code: "intrinsic-type-unsupported",
          target: intrinsic,
          messageId: "never",
        });
        return this.emitter.result.none();
      case "unknown":
        return code`object`;
      case "null":
      case "void":
        return code`None`;
      default:
        reportDiagnostic(this.emitter.getProgram(), {
          code: "intrinsic-type-unsupported",
          target: intrinsic,
          format: { name: name },
        });
        return code`object`;
    }
  }

  scalarDeclaration(scalar: Scalar, name: string): EmitterOutput<string> {
    switch (scalar.name) {
      case "boolean":
        return "bool";
      case "string":
      case "guid":
      case "url":
      case "uuid":
      case "password":
      case "armId":
      case "ipAddress":
      case "azureLocation":
      case "eTag":
        return "str";
      case "int16":
      case "int32":
      case "int64":
        return "int";
      case "float16":
      case "float32":
      case "float64":
        return "float";
      case "decimal":
      case "decimal128":
        return "Decimal";
      case "utcDateTime":
        return "datetime";
      default:
        return code`${this.#checkName(scalar.name)}`;
    }
  }

  scalarInstantiation(scalar: Scalar, name: string | undefined): EmitterOutput<string> {
    const base = this.#getBaseScalar(scalar);
    if (base !== undefined) {
      return this.emitter.emitTypeReference(base);
    } else {
      return this.emitter.result.none();
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
        code: "empty-union",
        target: union,
      });
    }
    if (hasNonLiterals) {
      builder.push(code`Union[`);
    }
    if (hasLiterals) {
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
