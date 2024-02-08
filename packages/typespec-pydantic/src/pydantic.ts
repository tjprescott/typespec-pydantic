import {
  ImportKind,
  DeclarationManager,
  DeclarationKind,
  PythonPartialModelEmitter,
  createEmitters,
  DeclarationDeferKind,
  GlobalNamespace,
} from "typespec-python";
import {
  EmitContext,
  Enum,
  EnumMember,
  Model,
  ModelProperty,
  Scalar,
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
import { getFields } from "./decorators.js";

export async function $onEmit(context: EmitContext<Record<string, never>>) {
  const emitter = createEmitters(context.program, PydanticEmitter, context)[0] as PydanticEmitter;
  emitter.declarations = new DeclarationManager();
  emitter.emitProgram({ emitTypeSpecNamespace: false });
  await emitter.writeAllOutput();
  if (!emitter.getProgram().compilerOptions.noEmit) {
    for (const sourceFile of emitter.getSourceFiles()) {
      if (sourceFile.globalScope.declarations.length > 0) {
        const initFile = await emitter.buildInitFile(new Map([[sourceFile.path, sourceFile]]));
        if (initFile !== undefined)
          await emitFile(emitter.getProgram(), {
            path: initFile.path,
            content: initFile.contents,
          });
      }
    }
  }
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

export class PydanticEmitter extends PythonPartialModelEmitter {
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
      return code`${this.emitTypeReference(value as Type)}`;
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

  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    const sfNs = this.buildNamespaceFromPath(sourceFile.path);
    if (sfNs === undefined) throw new Error(`Namespace for source file ${sourceFile.path} is undefined`);

    // if any deferred declaration is a model, import Pydantic BaseModel
    const deferredDecls = this.declarations!.get({
      rootPath: sfNs === GlobalNamespace ? `models` : `${sfNs}.models`,
      defer: DeclarationDeferKind.Deferred,
    });
    for (const item of deferredDecls) {
      if (item.source?.kind === "Model") {
        this.imports.add("pydantic", "BaseModel", ImportKind.regular, sourceFile);
        break;
      }
    }
    return super.sourceFile(sourceFile);
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
        this.imports.add(targetPath === GlobalNamespace ? "models" : targetPath, targetName, ImportKind.deferred);
      }
    }
    return super.circularReference(target, scope, cycle);
  }

  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
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
    return this.declarations!.declare(this, {
      name: name,
      namespace: model.namespace,
      kind: DeclarationKind.Model,
      value: builder.reduce(),
      omit: false,
      globalImportPath: "models",
    });
  }

  modelLiteral(model: Model): EmitterOutput<string> {
    // Unsupported. See: `anonymous-model` rule
    return code`object`;
  }

  #codeForType(
    name: string,
    type: Model | Scalar,
    sourceFile?: SourceFile<string>,
  ): string | StringBuilder | undefined {
    if (type.kind === "Model") {
      const props = this.emitter.emitModelProperties(type);
      return code`class ${name}(BaseModel):\n${props}\n`;
    } else if (type.kind === "Scalar") {
      return this.emitScalar(type, name, sourceFile) + "\n";
    }
    return undefined;
  }

  modelInstantiation(model: Model, name: string | undefined): EmitterOutput<string> {
    if (model.name === "Record") {
      const type = model.templateMapper?.args[0];
      this.imports.add("typing", "Dict");
      return code`Dict[str, ${type ? this.emitTypeReference(type) : "None"}]`;
    } else {
      const modelName = this.transformReservedName(name ?? model.name);
      const namespace = this.importPathForNamespace(model.namespace) ?? "";
      const fullPath = `${String(namespace)}.${modelName}`;
      if (this.declarations!.has(fullPath)) {
        return code`${modelName}`;
      } else {
        const code = this.#codeForType(modelName, model);
        return this.declarations!.declare(this, {
          name: modelName,
          namespace: model.namespace,
          kind: DeclarationKind.Model,
          value: code,
          omit: false,
          globalImportPath: "models",
        });
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
    type = this.emitTypeReference(property.type);

    const sourceNs = property.model ? this.importPathForNamespace(property.model.namespace) : undefined;
    const destNs = property.type.kind === "Model" ? this.importPathForNamespace(property.type.namespace) : undefined;
    if (
      sourceNs !== undefined &&
      destNs !== undefined &&
      sourceNs !== destNs &&
      destNs !== "type_spec" &&
      type instanceof Placeholder === false
    ) {
      this.imports.add(destNs === GlobalNamespace ? "models" : destNs, type.toString());
    }

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
      builder.push(code`${this.emitTypeReference(property.type.type)}`);
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
    return code`${this.emitTypeReference(property.type)}`;
  }

  enumDeclaration(en: Enum, name: string): EmitterOutput<string> {
    const members = this.emitter.emitEnumMembers(en);
    const builder = new StringBuilder();
    this.imports.add("enum", "Enum");
    builder.push(code`class ${name}(Enum):\n`);
    this.emitDocs(builder, en);
    builder.push(code`${members}`);
    return this.declarations!.declare(this, {
      name: name,
      namespace: en.namespace,
      kind: DeclarationKind.Model,
      value: builder.reduce(),
      omit: false,
      globalImportPath: "models",
    });
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
    builder.push(code`${this.indent()}root: List[${this.emitTypeReference(elementType)}]\n\n`);
    builder.push(code`${this.indent()}def __iter__(self):\n${this.indent(2)}return iter(self.root)\n\n`);
    builder.push(code`${this.indent()}def __getitem__(self, item):\n${this.indent(2)}return self.root[item]\n\n`);
    return this.declarations!.declare(this, {
      name: name,
      namespace: array.namespace,
      kind: DeclarationKind.Model,
      value: builder.reduce(),
      omit: false,
      globalImportPath: "models",
    });
  }

  emitScalar(scalar: Scalar, name: string, sourceFile?: SourceFile<string>): string | Placeholder<string> {
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
    return this.emitter.result.declaration(converted, this.emitScalar(scalar, converted));
  }

  scalarInstantiation(scalar: Scalar, name: string | undefined): EmitterOutput<string> {
    const converted = this.convertScalarName(scalar, name);
    const namespace = this.importPathForNamespace(scalar.namespace);
    const fullPath = `${String(namespace)}.${converted}`;
    if (this.declarations!.has(fullPath)) {
      return code`${converted}`;
    } else {
      this.declarations!.defer(fullPath, {
        name: converted,
        kind: DeclarationKind.Model,
        source: scalar,
        omit: false,
        globalImportPath: "models",
      });
      return code`"${converted}"`;
    }
  }

  unionDeclaration(union: Union, name: string): EmitterOutput<string> {
    return this.declarations!.declare(this, {
      name: name,
      namespace: union.namespace,
      kind: DeclarationKind.Model,
      value: undefined,
      omit: true,
      globalImportPath: "models",
    });
  }

  unionInstantiation(union: Union, name: string): EmitterOutput<string> {
    return this.emitter.emitUnionVariants(union);
  }
}
