import {
  ImportKind,
  DeclarationManager,
  DeclarationKind,
  PythonPartialModelEmitter,
  createEmitters,
  GlobalNamespace,
} from "typespec-python";
import {
  EmitContext,
  Enum,
  EnumMember,
  Model,
  ModelProperty,
  NoTarget,
  Scalar,
  Type,
  Union,
  emitFile,
  getDoc,
  getKeyName,
  getKnownValues,
  getMaxLength,
  getNamespaceFullName,
  getVisibility,
} from "@typespec/compiler";
import { EmitterOutput, Placeholder, SourceFile, StringBuilder, code } from "@typespec/compiler/emitter-framework";
import { getFields } from "./decorators.js";
import { reportDiagnostic } from "./lib.js";

export async function $onEmit(context: EmitContext<Record<string, never>>) {
  const emitter = createEmitters(context.program, DjangoEmitter, context)[0] as DjangoEmitter;
  emitter.declarations = new DeclarationManager();
  emitter.emitProgram({ emitTypeSpecNamespace: false });
  await emitter.writeAllOutput();
  if (!emitter.getProgram().compilerOptions.noEmit) {
    for (const sourceFile of emitter.getSourceFiles()) {
      const initFile = await emitter.buildInitFile(new Map([[sourceFile.path, sourceFile]]));
      if (initFile !== undefined) {
        await emitFile(emitter.getProgram(), {
          path: initFile.path,
          content: initFile.contents,
        });
      }
    }
  }
}

// FIXME: Move validation here
// export function $onValidate(context: EmitContext<Record<string, never>>) {
//   navigateProgram(context.program, {
//     namespace: (namespace) => {
//       const test = "best";
//     },
//     model: (model) => {
//       const test = "best";
//     },
//   });
// }

/// Metadata for a Django field.
interface DjangoFieldMetadata {
  [key: string]: string | StringBuilder | number | boolean | string[] | Type | undefined | null | Map<string, string>;
  /** If True, Django will store empty values as NULL in the database. Default is False. */
  null?: boolean;
  /** If True, the field is allowed to be blank. Default is False. */
  blank?: boolean;
  /** An enum containing the choices for this field. */
  choices?: Enum;
  /** The name of the database column to use for this field. If omitted, Django will use the field's name. */
  dbColumn?: string;
  /** The comment on the database column to use for this field.  */
  dbComment?: string;
  /** If True, a database index will be created for this field. */
  dbIndex?: boolean;
  /** The name of the database tablespace to use for this field's index, if this field is indexed. */
  dbTablespace?: string;
  /** The default value for the field. */
  default?: Type | null;
  /** If False, the field will not be displayed in the admin or any other ModelForm. Default is True. */
  editable?: boolean;
  /** Lets you override the default messages that the field will raise. Pass in dictionary with keys matching the error messages you want to override. */
  errorMessages?: Map<string, string>;
  /** Extra "help" text to displayed in the form widget. */
  helpText?: string | StringBuilder;
  /** If True, this field is the primary key for the model. */
  primaryKey?: boolean;
  /** If True, this field must be unique throughout the table. */
  unique?: boolean;
  /** Set this to the name of a date or datetime property to require that this field be unique for the value of the date field. */
  uniqueForDate?: boolean;
  /** Like uniqueForDate but required the field to be unique with respect to the month. */
  uniqueForMonth?: boolean;
  /** Like uniqueForDate but required the field to be unique with respect to the year. */
  uniqueForYear?: boolean;
  /** A human-readable name of the field. */
  verboseName?: string;
  /** A list of validators to run for this field. */
  validators?: string[];
  /** The maximum length of the field. */
  maxLength?: number;
  /** The database collation name of the field. */
  dbCollation?: string;
  /** Automatically set the field to now every time the object is saved. Useful for "last-modified" timestamps. */
  autoNow?: boolean;
  /** Automatically set the field to now when the object is first created. Useful for creation of timestamps. */
  autoNowAdd?: boolean;
  /** Tha maximum number of digits allowed in the number. Must be greater than or equal to decimalPlaces. */
  maxDigits?: number;
  /** The number of decimal places to store with the number. */
  decimalPlaces?: number;
}

/** The field names that are applicable to every field. */
const UniversalFieldKeys: Set<string> = new Set([
  "null",
  "blank",
  "choices",
  "dbColumn",
  "dbComment",
  "dbDefault",
  "dbIndex",
  "dbTablespace",
  "default",
  "editable",
  "errorMessages",
  "helpText",
  "primaryKey",
  "unique",
  "uniqueForDate",
  "uniqueForMonth",
  "uniqueForYear",
  "verboseName",
  "validators",
]);

const FieldSpecificKeys = new Map<string, Set<string>>([
  ["BinaryField", new Set(["maxLength"])],
  ["CharField", new Set(["maxLength", "dbCollation"])],
  ["DateField", new Set(["autoNow", "autoNowAdd"])],
  ["DateTimeField", new Set(["autoNow", "autoNowAdd"])],
  ["DecimalField", new Set(["maxDigits", "decimalPlaces"])],
  ["EmailField", new Set(["maxLength"])],
  ["FileField", new Set(["uploadTo", "storage", "maxLength"])],
  ["FilePathField", new Set(["path", "match", "recursive", "allowFiles", "allowFolders", "maxLength"])],
  ["GenericIPAddressField", new Set(["protocol", "unpackIpv4"])],
  ["ImageField", new Set(["uploadTo", "widthField", "heightField", "maxLength"])],
  ["SlugField", new Set(["maxLength"])],
  ["TimeField", new Set(["autoNow", "autoNowAdd"])],
  ["URLField", new Set(["maxLength"])],
  ["ForeignKey", new Set(["to", "onDelete"])],
  [
    "ManyToManyField",
    new Set([
      "to",
      "relatedName",
      "relatedQueryName",
      "limitChoicesTo",
      "symmetrical",
      "through",
      "throughFields",
      "dbTable",
      "dbConstraint",
      "swappable",
    ]),
  ],
  ["OneToOneField", new Set(["to", "parentLink", "onDelete"])],
]);

export class DjangoEmitter extends PythonPartialModelEmitter {
  #emitFieldValue(
    value: string | StringBuilder | number | boolean | Type | string[] | null | Map<string, string>,
  ): string | StringBuilder {
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

  #emitFieldParameters(
    builder: StringBuilder,
    item: ModelProperty | EnumMember | Scalar,
    fieldName: string | StringBuilder,
    sourceFile?: SourceFile<string>,
  ): StringBuilder {
    const metadata: DjangoFieldMetadata = {};

    // gather metadata
    const doc = getDoc(this.emitter.getProgram(), item);
    const mergedLines = doc?.split("\n").join("\\n");
    metadata.helpText = mergedLines !== undefined ? code`"${mergedLines}"` : undefined;
    if (item.kind === "ModelProperty") {
      const key = getKeyName(this.emitter.getProgram(), item);
      if (key === item.name) {
        metadata.primaryKey = true;
      }
      const isOptional = item.optional;
      if (item.default !== undefined) {
        metadata.default = item.default;
      } else if (isOptional) {
        metadata.default = null;
        metadata.blank = true;
      }
    } else if (item.kind === "EnumMember") {
      // FIXME: Update for enums
      // metadata.default = item.value !== undefined ? item.value : this.transformReservedName(item.name);
      // metadata.frozen = true;
      metadata.choices = item.enum;
    }

    // check for read-only properties
    const visibility = getVisibility(this.emitter.getProgram(), item);
    if (visibility !== undefined && visibility.length === 1 && visibility[0] === "read") {
      metadata.editable = false;
    }

    // gather string metadata
    metadata.maxLength = getMaxLength(this.emitter.getProgram(), item);

    // TODO: completely unsupported metadata
    metadata.errorMessages = undefined;
    metadata.validators = undefined;

    // TODO: Supported with @field decorator
    metadata.null = undefined;
    metadata.dbColumn = undefined;
    metadata.dbComment = undefined;
    metadata.dbIndex = undefined;
    metadata.dbTablespace = undefined;
    metadata.unique = undefined;
    metadata.uniqueForDate = undefined;
    metadata.uniqueForMonth = undefined;
    metadata.uniqueForYear = undefined;
    metadata.verboseName = undefined;
    metadata.dbCollation = undefined;
    metadata.autoNow = undefined;
    metadata.autoNowAdd = undefined;
    metadata.maxDigits = undefined;
    metadata.decimalPlaces = undefined;

    const fieldType = fieldName.toString().split(".").pop() ?? "UNKNOWN";

    if (item.kind === "ModelProperty") {
      const fields = getFields(this.emitter.getProgram(), item);
      for (const field of fields ?? []) {
        const fieldKeys = FieldSpecificKeys.get(fieldType) ?? new Set<string>([]);
        const allowedKeys = new Set<string>([...fieldKeys, ...UniversalFieldKeys]);
        if (!allowedKeys.has(field.key)) {
          // FIXME: Move this to $onValidate
          const program = this.emitter.getProgram();
          reportDiagnostic(program, {
            code: "invalid-field-value",
            format: {
              fieldName: fieldType,
              value: field.key,
            },
            target: NoTarget,
          });
        }
        metadata[field.key] = field.value;
      }
    }

    // delete any undefined values
    for (const [key, val] of Object.entries(metadata)) {
      if (val === undefined) {
        delete metadata[key];
      }
    }

    builder.push(code`(`);
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

  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    const builder = new StringBuilder();
    const baseModel = model.baseModel?.name ?? "models.Model";
    if (baseModel === "models.Model") {
      this.imports.add("django.db", "models");
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

  #emitType(name: string, type: Model | Scalar, sourceFile?: SourceFile<string>): string | StringBuilder | undefined {
    if (type.kind === "Model") {
      const props = this.emitter.emitModelProperties(type);
      return code`class ${name}(models.Model):\n${props}\n`;
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
      const code = this.#emitType(modelName, model);
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

    builder.push(code`${this.transformReservedName(this.toSnakeCase(property.name))} = ${type}`);
    this.#emitFieldParameters(builder, property, type);
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
    // FIXME: See if this applicable to enums
    //this.#emitFieldParameters(builder, member);
    builder.push(code`\n`);
    this.emitDocs(builder, member);
    return builder.reduce();
  }

  enumMemberReference(member: EnumMember): EmitterOutput<string> {
    this.imports.add("typing", "Literal");
    return code`Literal[${member.enum.name}.${this.toSnakeCase(member.name).toUpperCase()}]`;
  }

  arrayDeclaration(array: Model, name: string, elementType: Type): EmitterOutput<string> {
    throw new Error("arrayDeclaration is not implemented for DjangoEmitter");
    const builder = new StringBuilder();
    this.imports.add("django.db", "models");
    this.imports.add("typing", "List");
    builder.push(code`class ${name}(models.RootModel):\n`);
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

    // FIXME: See if this applicable to scalars
    // this.#emitFieldParameters(builder, scalar, sourceFile);
    builder.push(code`]`);
    return builder.reduce();
  }

  /** Converts the Python primitive to a Django field name */
  #scalarToFieldName(scalarName: string): string | StringBuilder {
    this.imports.add("django.db", "models");
    switch (scalarName) {
      case "str":
        return code`models.CharField`;
      case "int":
        return code`models.IntegerField`;
      case "float":
        return code`models.FloatField`;
      case "bool":
        return code`models.BooleanField`;
      case "Decimal":
        return code`models.DecimalField`;
      case "datetime":
        return code`models.DateTimeField`;
      case "date":
        return code`models.DateField`;
      case "time":
        return code`models.TimeField`;
      case "bytes":
        return code`models.BinaryField`;
      case "list":
      case "tuple":
      case "range":
      case "bytearray":
      case "memoryview":
      case "dict":
      case "set":
      case "frozenset":
      case "complex":
        throw new Error(`${scalarName} not supported in Django`);
      default:
        return code`${scalarName}`;
    }
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
        return this.#scalarToFieldName(converted);
      }
    }
    return this.declarations!.declare(this, {
      name: converted,
      namespace: scalar.namespace,
      kind: DeclarationKind.Model,
      value: code`${this.emitScalar(scalar, converted)}`,
      omit: false,
      globalImportPath: "models",
    });
  }

  scalarInstantiation(scalar: Scalar, name: string | undefined): EmitterOutput<string> {
    const converted = this.convertScalarName(scalar, name);
    const code = this.#emitType(converted, scalar);
    return this.declarations!.declare(this, {
      name: converted,
      namespace: scalar.namespace,
      kind: DeclarationKind.Model,
      value: code,
      omit: false,
      globalImportPath: "models",
    });
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
