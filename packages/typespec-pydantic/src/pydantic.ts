import { PythonPartialEmitter } from "typespec-python";
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
  Context,
  EmitEntity,
  EmittedSourceFile,
  EmitterOutput,
  Placeholder,
  ReferenceCycle,
  Scope,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { PydanticEmitterOptions, reportDiagnostic } from "./lib.js";
import { getFields } from "./decorators.js";
import { ImportKind } from "../../typespec-python/dist/src/import-util.js";

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

export class PydanticEmitter extends PythonPartialEmitter {
  private currNamespace: string[] = [];

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
      return code`${this.#emitTypeReference(value as Type)}`;
    }
  }

  #emitField(
    builder: StringBuilder,
    item: ModelProperty | EnumMember | Scalar,
    emitEquals: boolean = true,
    emitEmptyField: boolean = false,
    sourceFile?: SourceFile<string>,
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
      metadata.default = item.value !== undefined ? item.value : this.transformReservedName(item.name);
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
      const discriminator = this.findDiscriminator(item.type);
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
    this.imports.add("pydantic", "Field", ImportKind.regular, sourceFile);
    builder.push(code`Field(`);
    let i = 0;
    const length = Object.keys(metadata).length;
    for (const [key, val] of Object.entries(metadata)) {
      if (val === undefined) continue;
      const pythonKey = this.toSnakeCase(key);
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
    if (namespace.name === "TypeSpec") {
      return {};
    }
    const fullPath = getNamespaceFullName(namespace)
      .split(".")
      .map((seg) => this.toSnakeCase(seg))
      .join("/");
    this.emitter.createSourceFile(`${fullPath}/__init__.py`);
    const modelsFile = this.emitter.createSourceFile(`${fullPath}/models.py`);
    return {
      scope: modelsFile.globalScope,
    };
  }

  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    const builder = new StringBuilder();

    for (const [moduleName, names] of sourceFile.imports.entries()) {
      builder.push(code`from ${moduleName} import ${[...names].join(", ")}\n`);
    }

    const deferredImports = sourceFile.meta["deferredImports"] as Map<string, Set<string>>;
    if (deferredImports !== undefined) {
      builder.push(code`\nif TYPE_CHECKING:\n`);
      for (const [moduleName, names] of deferredImports.entries()) {
        builder.push(code`${this.indent()}from ${moduleName} import ${[...names].join(", ")}\n`);
      }
    }

    const emittedSourceFile: EmittedSourceFile = {
      path: sourceFile.path,
      contents: builder.reduce() + "\n",
    };

    for (const decl of sourceFile.globalScope.declarations) {
      emittedSourceFile.contents += decl.value + "\n\n";
    }

    for (const [name, item] of this.declarations.getDeferred()) {
      if (item.kind === "Model") {
        this.imports.add("pydantic", "BaseModel", ImportKind.regular, sourceFile);
        const props = this.emitter.emitModelProperties(item);
        const modelCode = code`class ${name}(BaseModel):\n${props}`;
        emittedSourceFile.contents += modelCode + "\n\n";
      } else if (item.kind === "Scalar") {
        const scalarCode = this.#emitScalar(item, name, sourceFile);
        emittedSourceFile.contents += scalarCode + "\n\n";
      }
    }
    return emittedSourceFile;
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

  async writeOutput(sourceFiles: SourceFile<string>[]): Promise<void> {
    const toEmit: EmittedSourceFile[] = [];

    const sortedFiles = this.#matchSourceFiles(sourceFiles);
    for (const [modelFile, initFile] of sortedFiles) {
      const modelSf = await this.emitter.emitSourceFile(modelFile);
      if (modelFile.globalScope.declarations.length === 0) {
        continue;
      }
      toEmit.push(modelSf);
      if (initFile !== undefined) {
        toEmit.push(await this.emitInitFile(initFile, modelFile));
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

  circularReference(
    target: EmitEntity<string>,
    scope: Scope<string> | undefined,
    cycle: ReferenceCycle,
  ): string | EmitEntity<string> {
    if (scope?.kind === "sourceFile" && target.kind === "declaration") {
      const targetName = target.name;
      const targetPath = this.buildNamespaceFromScope(target.scope);
      const sourcePath = this.buildNamespaceFromScope(scope);
      if (targetPath !== sourcePath) {
        this.imports.add("typing", "TYPE_CHECKING");
        this.imports.add(targetPath, targetName, ImportKind.deferred);
      }
    }
    return super.circularReference(target, scope, cycle);
  }

  #emitTypeReference(type: Type) {
    const sourceNs = this.currNamespace.slice(-1)[0];
    const destNs = this.buildNamespaceFromModel(type as Model);
    if (sourceNs !== destNs && destNs !== undefined && destNs !== "type_spec") {
      this.imports.add(destNs, (type as Model).name);
    }
    const value = this.emitter.emitTypeReference(type);
    if (value.kind === "code" && value.value instanceof Placeholder && (value.value as any).segments === undefined) {
      return code`"${value}"`;
    }
    return code`${value}`;
  }

  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    const namespace = this.buildNamespaceFromModel(model);
    if (namespace !== undefined) {
      this.currNamespace.push(namespace);
    }
    const builder = new StringBuilder();
    const baseModel = model.baseModel?.name ?? "BaseModel";
    if (baseModel === "BaseModel") {
      this.imports.add("pydantic", "BaseModel");
    }
    builder.push(code`class ${name}(${baseModel}):\n`);
    this.emitDocs(builder, model);

    const props = this.emitter.emitModelProperties(model);
    if ([...model.properties.values()].length > 0) {
      builder.push(code`${props}`);
    } else {
      builder.push(code`${this.indent()}pass`);
    }
    this.currNamespace.pop();
    return this.declarations.declare(name, builder.reduce());
  }

  modelLiteral(model: Model): EmitterOutput<string> {
    // Unsupported. See: `anonymous-model` rule
    return code`object`;
  }

  modelInstantiation(model: Model, name: string | undefined): EmitterOutput<string> {
    if (model.name === "Record") {
      const type = model.templateMapper?.args[0];
      this.imports.add("typing", "Dict");
      return code`Dict[str, ${type ? this.#emitTypeReference(type) : "None"}]`;
    } else {
      const modelName = this.transformReservedName(name ?? model.name);
      if (this.declarations.has(modelName)) {
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
      const propResult = this.emitter.emitModelProperty(prop);
      builder.push(code`${this.indent()}${propResult}\n`);
    }
    return this.emitter.result.rawCode(builder.reduce());
  }

  modelPropertyLiteral(property: ModelProperty): EmitterOutput<string> {
    const builder = new StringBuilder();
    const isOptional = property.optional;
    const knownValues = getKnownValues(this.emitter.getProgram(), property);
    let type: string | StringBuilder | undefined = undefined;
    type = this.#emitTypeReference(property.type);
    // don't emit anything if type is `never`
    if (property.type.kind === "Intrinsic" && property.type.name === "never") return code``;

    const isLit = this.isLiteral(property.type);
    builder.push(code`${this.transformReservedName(this.toSnakeCase(property.name))}: `);
    if (isOptional) {
      this.imports.add("typing", "Optional");
      builder.push(code`Optional[`);
    }
    if (isLit) {
      this.imports.add("typing", "Literal");
      builder.push(code`Literal[`);
    }
    if (property.type.kind === "Union") {
      builder.push(code`${this.emitter.emitUnionVariants(property.type)}`);
    } else if (property.type.kind === "UnionVariant") {
      builder.push(code`${this.#emitTypeReference(property.type.type)}`);
    } else if (property.type.kind === "Scalar" && knownValues !== undefined) {
      builder.push(code`Union[${type}, ${knownValues.name}]`);
    } else {
      builder.push(code`${type}`);
    }
    if (isLit) {
      builder.push(code`]`);
    }
    if (isOptional) {
      builder.push(code`]`);
    }
    this.#emitField(builder, property);
    builder.push(code`\n`);
    this.emitDocs(builder, property);
    return builder.reduce();
  }

  modelPropertyReference(property: ModelProperty): EmitterOutput<string> {
    return code`${this.#emitTypeReference(property.type)}`;
  }

  enumDeclaration(en: Enum, name: string): EmitterOutput<string> {
    const members = this.emitter.emitEnumMembers(en);
    const builder = new StringBuilder();
    this.imports.add("enum", "Enum");
    builder.push(code`class ${name}(Enum):\n`);
    this.emitDocs(builder, en);
    builder.push(code`${members}`);
    return this.declarations.declare(name, builder.reduce());
  }

  enumMembers(en: Enum): EmitterOutput<string> {
    const builder = new StringBuilder();
    for (const member of en.members.values()) {
      builder.push(code`${this.indent()}${this.emitter.emitType(member)}\n`);
    }
    return this.emitter.result.rawCode(builder.reduce());
  }

  enumMember(member: EnumMember): EmitterOutput<string> {
    const builder = new StringBuilder();
    builder.push(code`${this.toSnakeCase(member.name).toUpperCase()}`);
    this.#emitField(builder, member);
    builder.push(code`\n`);
    this.emitDocs(builder, member);
    return builder.reduce();
  }

  enumMemberReference(member: EnumMember): EmitterOutput<string> {
    this.imports.add("typing", "Literal");
    return code`Literal[${member.enum.name}.${this.toSnakeCase(member.name).toUpperCase()}]`;
  }

  arrayDeclaration(array: Model, name: string, elementType: Type): EmitterOutput<string> {
    const builder = new StringBuilder();
    this.imports.add("pydantic", "RootModel");
    this.imports.add("typing", "List");
    builder.push(code`class ${name}(RootModel):\n`);
    builder.push(code`${this.indent()}root: List[${this.#emitTypeReference(elementType)}]\n\n`);
    builder.push(code`${this.indent()}def __iter__(self):\n${this.indent(2)}return iter(self.root)\n\n`);
    builder.push(code`${this.indent()}def __getitem__(self, item):\n${this.indent(2)}return self.root[item]\n\n`);
    return this.declarations.declare(name, builder.reduce());
  }

  arrayLiteral(array: Model, elementType: Type): EmitterOutput<string> {
    this.imports.add("typing", "List");
    return code`List[${this.#emitTypeReference(elementType)}]`;
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

  #emitScalar(scalar: Scalar, name: string, sourceFile?: SourceFile<string>): string | Placeholder<string> {
    const knownValues = getKnownValues(this.emitter.getProgram(), scalar);
    const builder = new StringBuilder();
    const baseScalarName = this.convertScalarName(this.getBaseScalar(scalar), undefined);
    this.imports.add("typing", "Annotated", ImportKind.regular, sourceFile);
    builder.push(code`${this.transformReservedName(this.toPascalCase(name))} = Annotated[`);
    if (knownValues !== undefined) {
      builder.push(code`Union[${baseScalarName}, ${knownValues.name}], `);
    } else {
      builder.push(code`${baseScalarName}, `);
    }

    this.#emitField(builder, scalar, false, true, sourceFile);
    builder.push(code`]`);
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
    const converted = this.convertScalarName(scalar, name);
    if (this.declarations.has(converted)) {
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
    this.imports.add("typing", "Tuple");
    builder.push(code`Tuple[`);
    for (const item of tuple.values) {
      builder.push(code`${this.#emitTypeReference(item)}`);
      if (++i < length) builder.push(code`, `);
      else builder.push(code`]`);
    }
    return builder.reduce();
  }

  unionDeclaration(union: Union, name: string): EmitterOutput<string> {
    return this.declarations.declare(name, undefined);
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
      const isLit = this.isLiteral(variant.type);
      if (isLit) {
        literals.push({
          type: variant.type,
          value: code`${this.#emitTypeReference(variant.type)}`,
        });
      } else {
        // value is already represented in nonLiterals array, don't add it again
        const value = code`${this.#emitTypeReference(variant.type)}`;
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
}
