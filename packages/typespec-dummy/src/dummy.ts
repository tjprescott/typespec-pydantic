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
  StringTemplate,
  Tuple,
  Type,
  Union,
  UnionVariant,
  emitFile,
  isTemplateDeclaration,
  navigateProgram,
} from "@typespec/compiler";
import {
  AssetEmitter,
  CodeTypeEmitter,
  Context,
  Declaration,
  EmitEntity,
  EmittedSourceFile,
  EmitterOutput,
  ReferenceCycle,
  Scope,
  SourceFile,
  StringBuilder,
  code,
  createAssetEmitter,
} from "@typespec/compiler/emitter-framework";

interface JoinOptions {
  separator: string;
  useNewline: boolean;
  separatorOnLast: boolean;
  indentOffset: number;
  transform: (item: Type) => EmitEntity<string>;
}

function isTypeSpec(type: Type): boolean {
  const ns: Namespace = (type as any).namespace;
  if (!ns) return false;
  const lowerName = ns.name.toLowerCase();
  return ["typespec", "reflection"].includes(lowerName);
}

function navigateProgramDebug(
  emitter: AssetEmitter<string, Record<string, never>>,
  options: { logEnter: boolean; logExit: boolean },
) {
  navigateProgram(emitter.getProgram(), {
    boolean: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("boolean", node);
    },
    decorator: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("decorator", node);
    },
    enum: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("enum", node);
    },
    enumMember: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("enumMember", node);
    },
    exitBoolean: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitBoolean", node);
    },
    exitDecorator: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitDecorator", node);
    },
    exitEnum: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitEnum", node);
    },
    exitEnumMember: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitEnumMember", node);
    },
    exitFunction: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitFunction", node);
    },
    exitFunctionParameter: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitFunctionParameter", node);
    },
    exitInterface: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitInterface", node);
    },
    exitIntrinsic: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitIntrinsic", node);
    },
    exitModel: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitModel", node.name);
    },
    exitModelProperty: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitModelProperty", node);
    },
    exitNamespace: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitNamespace", node);
    },
    exitOperation: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitOperation", node);
    },
    exitNumber: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitNumber", node);
    },
    exitObject: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitObject", node);
    },
    exitProjection: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitProjection", node);
    },
    exitScalar: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitScalar", node);
    },
    exitString: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitString", node);
    },
    exitStringTemplate: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitStringTemplate", node);
    },
    exitStringTemplateSpan: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitStringTemplateSpan", node);
    },
    exitTemplateParameter: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitTemplateParameter", node);
    },
    exitTuple: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitTuple", node);
    },
    exitUnion: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitUnion", node);
    },
    exitUnionVariant: (node) => {
      if (!options.logExit) return;
      if (isTypeSpec(node)) return;
      console.log("exitUnionVariant", node);
    },
    function: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("function", node);
    },
    functionParameter: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("functionParameter", node);
    },
    interface: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("interface", node);
    },
    intrinsic: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("intrinsic", node.name);
    },
    model: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("model", node.name);
    },
    modelProperty: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("modelProperty", node.name);
    },
    namespace: (node) => {
      if (!options.logEnter) return;
      const lowerName = node.name.toLowerCase();
      if (["typespec", "reflection"].includes(lowerName)) return;
      console.log("namespace", node.name);
    },
    operation: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("operation", node.name);
    },
    projection: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("projection", node);
    },
    scalar: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("scalar", node.name);
    },
    string: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("string", node.value);
    },
    stringTemplate: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("stringTemplate", node);
    },
    number: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("number", node.valueAsString);
    },
    object: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("object", node);
    },
    root: (node) => {
      if (!options.logEnter) return;
      console.log("root");
    },
    tuple: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("tuple", node);
    },
    stringTemplateSpan: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("stringTemplateSpan", node);
    },
    templateParameter: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("templateParameter", node);
    },
    union: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("union", node);
    },
    unionVariant: (node) => {
      if (!options.logEnter) return;
      if (isTypeSpec(node)) return;
      console.log("unionVariant", node);
    },
  });
}

export async function $onEmit(context: EmitContext<Record<string, never>>) {
  const emitter = createAssetEmitter(context.program, DummyEmitter, context);
  emitter.emitProgram({ emitTypeSpecNamespace: false });
  //navigateProgramDebug(emitter, { logEnter: false, logExit: true });
  await emitter.writeOutput();
}

export class DummyEmitter extends CodeTypeEmitter {
  // Spaces per level of indentation
  private INDENT = 2;

  private scopeName(scope: Scope<string>): string {
    const name = scope.name;
    return name === "" ? "GLOBAL" : name;
  }

  /**
   * Creates an indentation string based on the current scope and an optional offset.
   * @param offset The level offset to apply. Multiplied by the spaces per indent value.
   * @returns string with the correct number of spaces for the current scope.
   */
  private indent(offset: number = 0): string {
    const scope = this.emitter.getContext().scope;
    const level = this.getIndentLevel(scope);
    const indent = (level + offset) * this.INDENT;
    if (indent < 0) {
      throw new Error("Indentation level cannot be less than 0.");
    }
    return " ".repeat(indent);
  }

  private getIndentLevel(scope: Scope<string>): number {
    if (!scope.parentScope) {
      return 0;
    }
    return this.getIndentLevel(scope.parentScope) + 1;
  }

  /** This method makes it easier to handle joining collections in a configurable and consistent way.
   * It should probably be a core helper of EFv2.
   */
  #joinCollection(coll: readonly Type[], options: JoinOptions): string | StringBuilder {
    const builder = new StringBuilder();
    const length = coll.length;
    if (length === 0) {
      return "";
    }
    const emitEnitities = coll.map((item) => options.transform(item));
    // only use indent when putting each item on its own line
    const indent = options.useNewline ? this.indent(options.indentOffset ?? 0) : "";
    if (options.useNewline) {
      builder.push(`\n`);
    }
    for (const [index, item] of emitEnitities.entries()) {
      if (index !== length - 1) {
        builder.push(code`${indent}${item}${options.separator}`);
        if (options.useNewline) {
          builder.push(`\n`);
        }
      } else {
        builder.push(code`${indent}${item}`);
        if (options.separatorOnLast) {
          builder.push(options.separator);
        }
      }
    }
    return builder.reduce();
  }

  // SPECIAL METHODS

  programContext(program: Program): Context {
    const options = this.emitter.getOptions();
    const resolvedFileName = options["output-file"] ?? "dummy.tsp";
    const sourceFile = this.emitter.createSourceFile(resolvedFileName);
    return {
      scope: sourceFile.globalScope,
    };
  }

  namespaceContext(namespace: Namespace): Context {
    console.log(`namespaceContext: ${namespace.name}`);
    const context = this.emitter.getContext();
    const parentScope = context.scope;
    const scope = this.emitter.createScope(namespace, namespace.name, parentScope);
    return {
      scope,
    };
  }

  unionDeclarationContext(union: Union): Context {
    const context = this.emitter.getContext();
    return {
      ...context,
      joinOpts: {
        separator: ",",
        useNewline: true,

        separatorOnLast: true,
        transform: (item: Type) => this.emitter.emitType(item),
      },
    };
  }

  unionLiteralContext(union: Union): Context {
    const context = this.emitter.getContext();
    return {
      ...context,
      joinOpts: {
        separator: " | ",
        useNewline: false,
        separatorOnLast: false,
        transform: (item: Type) => this.emitter.emitType(item),
      },
    };
  }

  /** I definitely feel like I should NOT have to write this. In EFv2, this would be handled by a callable I provide when
   *  creating the file.
   */
  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    const builder = new StringBuilder();
    for (const decl of sourceFile.globalScope.declarations) {
      builder.push(decl.value + "\n");
    }
    return {
      path: sourceFile.path,
      contents: builder.reduce().toString(),
    };
  }

  /**
   * I also feel I shouldn't have to write this either. This should be handled by the emitter framework.
   */
  async writeOutput(sourceFiles: SourceFile<string>[]): Promise<void> {
    const toEmit: EmittedSourceFile[] = [];
    for (const file of sourceFiles) {
      // don't emit empty files
      const decls = file.globalScope.declarations;
      if (decls.length === 0 && file.globalScope.childScopes.length === 0) continue;

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

  circularReference(
    target: EmitEntity<string>,
    scope: Scope<string> | undefined,
    cycle: ReferenceCycle,
  ): string | EmitEntity<string> {
    console.log(`circularReference: ${(target as any).name ?? "anonymous"}`);
    return super.circularReference(target, scope, cycle);
  }

  reference(
    targetDeclaration: Declaration<string>,
    pathUp: Scope<string>[],
    pathDown: Scope<string>[],
    commonScope: Scope<string> | null,
  ): string | EmitEntity<string> {
    console.log(`reference: ${(targetDeclaration as any).name ?? "anonymous"}`);
    return super.reference(targetDeclaration, pathUp, pathDown, commonScope);
  }

  // TYPE METHODS

  /**
   * Example: model StringArray is Array<String>;
   * Behavior: Emit the indexer type but collect no code.
   * Structure: Create declaration with the relevant code.
   */
  arrayDeclaration(array: Model, name: string, elementType: Type): EmitterOutput<string> {
    console.log(`arrayDeclaration: ${name} ${(elementType as any).name ?? "anonymous"}`);
    this.emitter.emitType(array.indexer!.value);
    const value = code`${this.indent()}model ${name} is Array<${(elementType as any).name ?? "anonymous"}>;\n`;
    return this.emitter.result.declaration(name, value);
  }

  /**
   * Example: myProp: string[];
   * Behavior: Nothing
   * Structure: Emit the relevant code.
   */
  arrayLiteral(array: Model, elementType: Type): EmitterOutput<string> {
    console.log(`arrayLiteral: ${(elementType as any).name ?? "anonymous"}`);
    return code`${(elementType as any).name ?? "anonymous"}[]`;
  }

  /**
   * Example: myProp: false;
   * Behavior: Nothing
   * Structure: Emit the relevant code.
   */
  booleanLiteral(boolean: BooleanLiteral): EmitterOutput<string> {
    console.log(`booleanLiteral: ${boolean.value}`);
    return code`${boolean.value.toString()}`;
  }
  /**
   * Example: enum Result { Success, Failure };
   * Behavior: Emits enum members and collect their code.
   * Structure: Create declaration with the relevant code.
   */
  enumDeclaration(en: Enum, name: string): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    console.log(`enumDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`// scope: ${this.scopeName(scope)}\n`);
    builder.push(code`${this.indent()}enum ${name} {`);
    builder.push(code`${this.emitter.emitEnumMembers(en)}`);
    builder.push(code`\n${this.indent()}}`);
    return this.emitter.result.declaration(name, builder.reduce());
  }

  /**
   * Example: enum Result { *Success*, Failure };
   * Behavior: Nothing, but this is always a child of an enum.
   * Structure: Emit the relevant code.
   */
  enumMember(member: EnumMember): EmitterOutput<string> {
    console.log(`enumMember: ${member.name}`);
    const builder = new StringBuilder();
    builder.push(code`${member.name}`);
    if (typeof member.value === "string") {
      builder.push(code`: "${member.value}"`);
    } else if (typeof member.value === "number") {
      builder.push(code`: ${member.value.toString()}`);
    }
    return builder.reduce();
  }

  /**
   * Example: myProp: Result.Success;
   * Behavior: Nothing
   * Structure: Emit the relevant code.
   */
  enumMemberReference(member: EnumMember): EmitterOutput<string> {
    console.log(`enumMemberReference: ${member.name}`);
    return code`${member.enum.name}.${member.name}`;
  }

  /**
   * Example: enum Result { *Success, Failure* };
   * Behavior: Iterate through enum members and collect their code.
   * Structure: Emit the collected code.
   */
  enumMembers(en: Enum): EmitterOutput<string> {
    console.log(`enumMembers: ${en.name}`);
    const builder = new StringBuilder();
    const opts: JoinOptions = {
      separator: ",",
      useNewline: true,
      indentOffset: 1,
      separatorOnLast: true,
      transform: (item) => this.emitter.emitType(item),
    };
    builder.push(code`${this.#joinCollection([...en.members.values()], opts)}`);
    return builder.reduce();
  }

  /**
   * Example: interface Pets { adopt(): Pet; }
   * Behavior: Emits the operations of the interface and collects their code.
   * Structure: Create declaration with the relevant code.
   */
  interfaceDeclaration(iface: Interface, name: string): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    console.log(`interfaceDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`// scope: ${this.scopeName(scope)}\n`);
    builder.push(code`${this.indent()}interface ${name} {`);
    builder.push(code`${this.emitter.emitInterfaceOperations(iface)}`);
    builder.push(code`\n${this.indent()}}`);
    return this.emitter.result.declaration(name, builder.reduce());
  }

  /**
   * Example: interface Pets { *adopt(): Pet*; }
   * Behavior: Iterate through operations and collect their code.
   * Structure: Emit the collected code.
   */
  interfaceDeclarationOperations(iface: Interface): EmitterOutput<string> {
    console.log(`interfaceDeclarationOperations: ${iface.name}`);
    const builder = new StringBuilder();
    const opts: JoinOptions = {
      separator: ";",
      useNewline: true,
      indentOffset: 1,
      separatorOnLast: true,
      transform: (item) => this.emitter.emitType(item),
    };
    builder.push(code`${this.#joinCollection([...iface.operations.values()], opts)}`);
    return builder.reduce();
  }

  /**
   * Example: interface Pets { *adopt(): Pet*; ... }
   * Behavior: Emits parameters and return type and collects their code.
   * Structure: Create declaration with the relevant code.
   */
  interfaceOperationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    console.log(`interfaceOperationDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`${this.indent()}op ${name}(${this.emitter.emitOperationParameters(operation)}): `);
    builder.push(code`${this.emitter.emitOperationReturnType(operation)}`);
    return this.emitter.result.declaration(name, builder.reduce());
  }

  /**
   * Example: myProp: unknown;
   * Behavior: Nothing
   * Structure: Emit the relevant code.
   */
  intrinsic(intrinsic: IntrinsicType, name: string): EmitterOutput<string> {
    console.log(`intrinsic: ${name}`);
    return code`${name}`;
  }

  /**
   * Example: model Foo {}
   * Behavior: Emits the properties of the model and collects their code. Emits the baseType but does not collect code.
   * Structure: Create declaration with the relevant code.
   */
  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    console.log(`modelDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`// scope: ${this.scopeName(scope)}\n`);
    builder.push(code`${this.indent()}model ${name} {`);
    if (model.baseModel) {
      this.emitter.emitType(model.baseModel);
    }
    builder.push(code`${this.emitter.emitModelProperties(model)}`);
    builder.push(code`\n${this.indent()}}\n`);
    return this.emitter.result.declaration(name, builder.reduce());
  }

  /**
   * Example: myProp: Foo<string>;
   * Behavior: Emits the baseType but does not collect code. Iterates through template arguments and collects their code.
   * Structure: Emit the collected code.
   */
  modelInstantiation(model: Model, name: string | undefined): EmitterOutput<string> {
    console.log(`modelInstantiation: ${name}`);
    if (model.baseModel) {
      this.emitter.emitType(model.baseModel);
    }
    const opts: JoinOptions = {
      separator: ", ",
      useNewline: false,
      indentOffset: 0,
      separatorOnLast: false,
      transform: (item) => this.emitter.emitTypeReference(item),
    };
    return code`${model.name}<${this.#joinCollection(model.templateMapper!.args, opts)}>`;
  }

  /**
   * Example: myProp: { val: string; };
   * Behavior: Emits the properties of the model and collects their code. Emits the baseType but does not collect code.
   * Structure: Emit the collected code.
   */
  modelLiteral(model: Model): EmitterOutput<string> {
    console.log(`modelLiteral: ${model.name}`);
    // how would this have a baseModel?
    if (model.baseModel) {
      this.emitter.emitType(model.baseModel);
    }
    const builder = new StringBuilder();
    builder.push(code`{${this.emitter.emitModelProperties(model)}\n${this.indent()}}`);
    return builder.reduce();
  }

  /**
   * Example: model Foo { *name: string; age: int16* };
   * Behavior: Iterate through properties and collect their code.
   * Structure: Emit the collected code.
   */
  modelProperties(model: Model): EmitterOutput<string> {
    console.log(`modelProperties: ${model.name}`);
    const builder = new StringBuilder();
    const opts: JoinOptions = {
      separator: ";",
      useNewline: true,
      indentOffset: 1,
      separatorOnLast: true,
      transform: (item) => this.emitter.emitModelProperty(item as ModelProperty),
    };
    builder.push(code`${this.#joinCollection([...model.properties.values()], opts)}`);
    return builder.reduce();
  }

  /**
   * Example: myProp: string;
   * Behavior: Nothing
   * Structure: Emit the relevant code.
   */
  modelPropertyLiteral(property: ModelProperty): EmitterOutput<string> {
    console.log(`modelPropertyLiteral: ${property.name}`);
    return code`${property.name}: ${this.emitter.emitTypeReference(property.type)}`;
  }

  /**
   * Example: myProp: Foo.name;
   * Behavior: Nothing
   * Structure: Emit the relevant code.
   */
  modelPropertyReference(property: ModelProperty): EmitterOutput<string> {
    console.log(`modelPropertyReference: ${property.name}`);
    return code`${property.model?.name ?? "anonymous"}.${property.name}`;
  }

  /**
   * Example: namespace Foo { ... };
   * Behavior: Emits the contents of the namespace and collects their code. Has workaround for NamespaceScope issue.
   * Structure: Create declaration with the collected code.
   */
  namespace(namespace: Namespace): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    const parentScope = scope.parentScope;
    console.log(`namespace: ${namespace.name}`);
    const builder = new StringBuilder();
    builder.push(code`// scope: ${this.scopeName(parentScope)}\n`);
    builder.push(`namespace ${namespace.name} { \n`);
    const opts: JoinOptions = {
      separator: "",
      useNewline: true,
      indentOffset: 0,
      separatorOnLast: true,
      transform: (item) => this.emitter.emitType(item),
    };
    builder.push(code`${this.#joinCollection([...namespace.namespaces.values()], opts)}`);
    const models = [...namespace.models.values()].filter((model) => !isTemplateDeclaration(model));
    builder.push(code`${this.#joinCollection(models, opts)}`);
    builder.push(code`${this.#joinCollection([...namespace.interfaces.values()], opts)}`);
    builder.push(code`${this.#joinCollection([...namespace.operations.values()], { ...opts, separator: ";" })}`);
    builder.push(code`${this.#joinCollection([...namespace.enums.values()], opts)}`);
    builder.push(code`${this.#joinCollection([...namespace.unions.values()], opts)}`);
    builder.push(code`${this.#joinCollection([...namespace.scalars.values()], opts)}`);
    builder.push(code`\n${this.indent(-1)}}`);

    // the namespace belongs to its parent scope, not its own scope.
    const decl = this.emitter.result.declaration(namespace.name, builder.reduce());
    decl.scope = parentScope;
    return decl;
  }

  /**
   * Example: myProp: 5;
   * Behavior: Nothing
   * Structure: Emit the relevant code.
   */
  numericLiteral(number: NumericLiteral): EmitterOutput<string> {
    console.log(`numericLiteral: ${number.value}`);
    return code`${number.value.toString()}`;
  }

  /**
   * Example: op myOp(param: string): string;
   * Behavior: Emits parameters and return type and collects their code.
   * Structure: Emit the collected code.
   */
  operationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    console.log(`operationDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`// scope: ${this.scopeName(scope)}\n`);
    builder.push(code`${this.indent()}op ${name}(${this.emitter.emitOperationParameters(operation)}): `);
    builder.push(code`${this.emitter.emitOperationReturnType(operation)}`);
    return builder.reduce();
  }

  /**
   * Example: op myOp(*param: string*): string;
   * Behavior: Iterates through parameters and collects their code.
   * Structure: Emit the collected code.
   */
  operationParameters(operation: Operation, parameters: Model): EmitterOutput<string> {
    console.log(`operationParameters: ${operation.name}`);
    const builder = new StringBuilder();
    const opts: JoinOptions = {
      separator: ", ",
      useNewline: false,
      indentOffset: 0,
      separatorOnLast: false,
      transform: (item) => this.emitter.emitModelProperty(item as ModelProperty),
    };
    builder.push(code`${this.#joinCollection([...parameters.properties.values()], opts)}`);
    return builder.reduce();
  }

  /**
   * Example: op myOp(param: string): *string*;
   * Behavior: Nothing
   * Structure: Emit the relevant code.
   */
  operationReturnType(operation: Operation, returnType: Type): EmitterOutput<string> {
    console.log(`operationReturnType: ${operation.name}`);
    return code`${this.emitter.emitTypeReference(returnType)}`;
  }

  /**
   * Example: scalar MyScalar extends string;
   * Behavior: Emits the baseScalar but does not collect code. Seems to conflate scalar reference with true declaration.
   * Structure: Create declaration with the relevant code.
   */
  scalarDeclaration(scalar: Scalar, name: string): EmitterOutput<string> {
    console.log(`scalarDeclaration: ${name}`);
    if (scalar.baseScalar) {
      this.emitter.emitType(scalar.baseScalar);
    }
    const builder = new StringBuilder();

    // FIXME: Seems like a bug that this can't distinguish between an actual scalar declaration and
    // a scalar reference.
    if (scalar.baseScalar) {
      builder.push(code`${this.indent()}scalar ${name} extends ${scalar.baseScalar.name};\n`);
    } else {
      builder.push(code`${name}`);
    }
    return this.emitter.result.declaration(name, builder.reduce());
  }

  // TODO
  scalarInstantiation(scalar: Scalar, name: string | undefined): EmitterOutput<string> {
    console.log(`scalarInstantiation: ${name}`);
    return super.scalarInstantiation(scalar, name);
  }

  /**
   * Example: myProp: "Foo";
   * Behavior: Nothing
   * Structure: Emit the relevant code.
   */
  stringLiteral(string: StringLiteral): EmitterOutput<string> {
    console.log(`stringLiteral: ${string.value}`);
    return code`"${string.value}"`;
  }

  // TODO
  stringTemplate(stringTemplate: StringTemplate): EmitterOutput<string> {
    console.log(`stringTemplate: ${stringTemplate}`);
    return super.stringTemplate(stringTemplate);
  }

  /**
   * Example: myProp: [string, int16];
   * Behavior: Emits the tuple values and collects their code.
   * Structure: Emit the collected code.
   */
  tupleLiteral(tuple: Tuple): EmitterOutput<string> {
    console.log(`tupleLiteral: ${tuple.values}`);
    return code`[${this.emitter.emitTupleLiteralValues(tuple)}]`;
  }

  /**
   * Example: myProp: [*string, int16*];
   * Behavior: Iterate through tuple values and collect their code.
   * Structure: Emit the collected code.
   */
  tupleLiteralValues(tuple: Tuple): EmitterOutput<string> {
    console.log(`tupleLiteralValues: ${tuple.values}`);
    const builder = new StringBuilder();
    const opts: JoinOptions = {
      separator: ", ",
      useNewline: false,
      indentOffset: 0,
      separatorOnLast: false,
      transform: (item) => this.emitter.emitType(item),
    };
    builder.push(code`${this.#joinCollection(tuple.values, opts)}`);
    return builder.reduce();
  }

  /**
   * Example: union Result { Success, Failure };
   * Behavior: Emits union variants and collects their code.
   * Structure: Create declaration with the relevant code.
   */
  unionDeclaration(union: Union, name: string): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    console.log(`unionDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`// scope: ${this.scopeName(scope)}\n`);
    builder.push(code`${this.indent()}union ${name} {`);
    builder.push(code`${this.emitter.emitUnionVariants(union)}`);
    builder.push(code`${this.indent()}}`);
    return this.emitter.result.declaration(name, builder.reduce());
  }

  // TODO
  unionInstantiation(union: Union, name: string): EmitterOutput<string> {
    console.log(`unionInstantiation: ${name}`);
    return super.unionInstantiation(union, name);
  }

  /**
   * Example: myProp: "success" | "failure";
   * Behavior: Emit union variants and collect their code.
   * Structure: Emit the collected code.
   */
  unionLiteral(union: Union): EmitterOutput<string> {
    console.log(`unionLiteral: ${union.name}`);
    return code`${this.emitter.emitUnionVariants(union)}`;
  }

  /**
   * Example: myProp: *Success* | Failure;
   * Behavior: Nothing
   * Structure: Emit the relevant code.
   */
  unionVariant(variant: UnionVariant): EmitterOutput<string> {
    console.log(`unionVariant: ${String(variant.name) ?? "unknown"}`);
    return code`${this.emitter.emitTypeReference(variant.type)}`;
  }

  /**
   * Example: myProp: *"success" | "failure" | "error"*;
   * Behavior: Iterate through union variants and collect their code.
   * Structure: Emit the collected code.
   */
  unionVariants(union: Union): EmitterOutput<string> {
    console.log(`unionVariants: ${union.name}`);
    const builder = new StringBuilder();
    const context = this.emitter.getContext();
    const opts = context.joinOpts;
    builder.push(code`${this.#joinCollection([...union.variants.values()], opts)}`);
    return builder.reduce();
  }
}
