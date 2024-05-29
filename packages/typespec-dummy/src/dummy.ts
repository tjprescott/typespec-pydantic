import { DeclarationManager, createEmitters } from "typespec-python";
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
  Placeholder,
  ReferenceCycle,
  Scope,
  SourceFile,
  StringBuilder,
  code,
  createAssetEmitter,
} from "@typespec/compiler/emitter-framework";

function navigateProgramDebug(emitter: AssetEmitter<string, Record<string, never>>) {
  navigateProgram(emitter.getProgram(), {
    boolean: (node) => {
      console.log("boolean", node);
    },
    decorator: (node) => {
      console.log("decorator", node);
    },
    enum: (node) => {
      console.log("enum", node);
    },
    enumMember: (node) => {
      console.log("enumMember", node);
    },
    exitBoolean: (node) => {
      console.log("exitBoolean", node);
    },
    exitDecorator: (node) => {
      console.log("exitDecorator", node);
    },
    exitEnum: (node) => {
      console.log("exitEnum", node);
    },
    exitEnumMember: (node) => {
      console.log("exitEnumMember", node);
    },
    exitFunction: (node) => {
      console.log("exitFunction", node);
    },
    exitFunctionParameter: (node) => {
      console.log("exitFunctionParameter", node);
    },
    exitInterface: (node) => {
      console.log("exitInterface", node);
    },
    exitIntrinsic: (node) => {
      console.log("exitIntrinsic", node);
    },
    exitModel: (node) => {
      console.log("exitModel", node);
    },
    exitModelProperty: (node) => {
      console.log("exitModelProperty", node);
    },
    exitNamespace: (node) => {
      console.log("exitNamespace", node);
    },
    exitOperation: (node) => {
      console.log("exitOperation", node);
    },
    exitNumber: (node) => {
      console.log("exitNumber", node);
    },
    exitObject: (node) => {
      console.log("exitObject", node);
    },
    exitProjection: (node) => {
      console.log("exitProjection", node);
    },
    exitScalar: (node) => {
      console.log("exitScalar", node);
    },
    exitString: (node) => {
      console.log("exitString", node);
    },
    exitStringTemplate: (node) => {
      console.log("exitStringTemplate", node);
    },
    exitStringTemplateSpan: (node) => {
      console.log("exitStringTemplateSpan", node);
    },
    exitTemplateParameter: (node) => {
      console.log("exitTemplateParameter", node);
    },
    exitTuple: (node) => {
      console.log("exitTuple", node);
    },
    exitUnion: (node) => {
      console.log("exitUnion", node);
    },
    exitUnionVariant: (node) => {
      console.log("exitUnionVariant", node);
    },
    function: (node) => {
      console.log("function", node);
    },
    functionParameter: (node) => {
      console.log("functionParameter", node);
    },
    interface: (node) => {
      console.log("interface", node);
    },
    intrinsic: (node) => {
      console.log("intrinsic", node);
    },
    model: (node) => {
      console.log("model", node);
    },
    modelProperty: (node) => {
      console.log("modelProperty", node);
    },
    namespace: (node) => {
      console.log("namespace", node);
    },
    operation: (node) => {
      console.log("operation", node);
    },
    projection: (node) => {
      console.log("projection", node);
    },
    scalar: (node) => {
      console.log("scalar", node);
    },
    string: (node) => {
      console.log("string", node);
    },
    stringTemplate: (node) => {
      console.log("stringTemplate", node);
    },
    number: (node) => {
      console.log("number", node);
    },
    object: (node) => {
      console.log("object", node);
    },
    root: (node) => {
      console.log("root", node);
    },
    tuple: (node) => {
      console.log("tuple", node);
    },
    stringTemplateSpan: (node) => {
      console.log("stringTemplateSpan", node);
    },
    templateParameter: (node) => {
      console.log("templateParameter", node);
    },
    union: (node) => {
      console.log("union", node);
    },
    unionVariant: (node) => {
      console.log("unionVariant", node);
    },
  });
}

export async function $onEmit(context: EmitContext<Record<string, never>>) {
  const emitter = createAssetEmitter(context.program, DummyEmitter, context);
  emitter.emitProgram({ emitTypeSpecNamespace: false });
  emitter.writeOutput();
}

export class DummyEmitter extends CodeTypeEmitter {
  /** Current level of indent */
  indent = 0;

  private ind(): string {
    return " ".repeat(this.indent);
  }

  // SPECIAL METHODS

  programContext(program: Program): Context {
    const options = this.emitter.getOptions();
    const resolvedFileName = options["output-file"] ?? "dummy.txt";
    const sourceFile = this.emitter.createSourceFile(resolvedFileName);
    return {
      scope: sourceFile.globalScope,
    };
  }

  namespaceContext(namespace: Namespace): Context {
    const context = this.emitter.getContext();
    const parentScope = context.scope;
    const scope = this.emitter.createScope(namespace, namespace.name, parentScope);
    return {
      scope,
    };
  }

  /** I definitely feel like I should NOT have to write this. */
  sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
    const builder = new StringBuilder();
    for (const decl of sourceFile.globalScope.declarations) {
      builder.push(decl.value + "\n");
    }
    for (const childScope of sourceFile.globalScope.childScopes) {
      for (const decl of childScope.declarations) {
        builder.push(decl.value + "\n");
      }
    }
    return {
      path: sourceFile.path,
      contents: builder.reduce().toString(),
    };
  }

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
    const result = super.reference(targetDeclaration, pathUp, pathDown, commonScope);
    if (result instanceof Placeholder) {
      return result;
    } else {
      return code`[Reference ${result}]`.toString();
    }
  }

  // TYPE METHODS

  arrayDeclaration(array: Model, name: string, elementType: Type): EmitterOutput<string> {
    console.log(`arrayDeclaration: ${name} ${(elementType as any).name ?? "anonymous"}`);
    this.emitter.emitType(array.indexer!.value);
    return code`[Array ${(elementType as any).name ?? "anonymous"}]`;
  }

  arrayLiteral(array: Model, elementType: Type): EmitterOutput<string> {
    console.log(`arrayLiteral: ${(elementType as any).name ?? "anonymous"}`);
    return code`[Array ${(elementType as any).name ?? "anonymous"}]`;
  }

  booleanLiteral(boolean: BooleanLiteral): EmitterOutput<string> {
    console.log(`booleanLiteral: ${boolean.value}`);
    return code`[Literal ${boolean.value.toString()}]`;
  }

  enumDeclaration(en: Enum, name: string): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    console.log(`enumDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`[Enum ${name}] {${scope.name}}`);
    builder.push(code`${this.emitter.emitEnumMembers(en)}`);
    return this.emitter.result.declaration(name, builder.reduce());
  }

  enumMember(member: EnumMember): EmitterOutput<string> {
    console.log(`enumMember: ${member.name}`);
    return code`[EnumMember ${member.name}]`;
  }

  enumMemberReference(member: EnumMember): EmitterOutput<string> {
    console.log(`enumMemberReference: ${member.name}`);
    return code`[EnumMemberRef ${member.enum.name}.${member.name}]`;
  }

  enumMembers(en: Enum): EmitterOutput<string> {
    console.log(`enumMembers: ${en.name}`);
    const builder = new StringBuilder();
    this.indent += 2;
    for (const member of en.members.values()) {
      builder.push(code`\n${this.ind()}${this.emitter.emitType(member)}`);
    }
    this.indent -= 2;
    return builder.reduce();
  }

  interfaceDeclaration(iface: Interface, name: string): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    console.log(`interfaceDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`[Interface ${name}] {${scope.name}}`);
    builder.push(code`${this.emitter.emitInterfaceOperations(iface)}`);
    return this.emitter.result.declaration(name, builder.reduce());
  }

  interfaceDeclarationOperations(iface: Interface): EmitterOutput<string> {
    console.log(`interfaceDeclarationOperations: ${iface.name}`);
    this.indent += 2;
    const builder = new StringBuilder();
    for (const operation of iface.operations.values()) {
      builder.push(code`\n${this.ind()}${this.emitter.emitType(operation)}`);
    }
    this.indent -= 2;
    return builder.reduce();
  }

  interfaceOperationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    console.log(`interfaceOperationDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`[Operation ${name}]`);
    builder.push(code`${this.emitter.emitOperationParameters(operation)}`);
    builder.push(code`${this.emitter.emitOperationReturnType(operation)}`);
    return this.emitter.result.declaration(name, builder.reduce());
  }

  intrinsic(intrinsic: IntrinsicType, name: string): EmitterOutput<string> {
    console.log(`intrinsic: ${name}`);
    return code`[Intrinsic ${name}]`;
  }

  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    console.log(`modelDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`[Model ${name}] {${scope.name}}`);
    if (model.baseModel) {
      this.emitter.emitType(model.baseModel);
    }
    builder.push(code`${this.emitter.emitModelProperties(model)}`);
    return this.emitter.result.declaration(name, builder.reduce());
  }

  // TODO
  modelInstantiation(model: Model, name: string | undefined): EmitterOutput<string> {
    console.log(`modelInstantiation: ${name}`);
    return super.modelInstantiation(model, name);
  }

  // TODO
  modelLiteral(model: Model): EmitterOutput<string> {
    console.log(`modelLiteral: ${model.name}`);
    return super.modelLiteral(model);
  }

  /** This only logically builds a string structure and returns it. Would it ever make
   * sense to return a declaration here?
   */
  modelProperties(model: Model): EmitterOutput<string> {
    console.log(`modelProperties: ${model.name}`);
    const builder = new StringBuilder();
    this.indent += 2;
    for (const prop of model.properties.values()) {
      builder.push(code`\n${this.ind()}${this.emitter.emitModelProperty(prop)}`);
    }
    this.indent -= 2;
    return builder.reduce();
  }

  modelPropertyLiteral(property: ModelProperty): EmitterOutput<string> {
    console.log(`modelPropertyLiteral: ${property.name}`);
    const typeRef = this.emitter.emitTypeReference(property.type);
    return code`[${property.name}: ${typeRef}]`;
  }

  modelPropertyReference(property: ModelProperty): EmitterOutput<string> {
    console.log(`modelPropertyReference: ${property.name}`);
    return code`[ModelPropertyRef ${property.model?.name ?? "anonymous"}.${property.name}]`;
  }

  /** This requires you to construct the namespace by directing the sequencing. You build up the code contents. */
  namespace(namespace: Namespace): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    console.log(`namespace: ${namespace.name}`);
    const builder = new StringBuilder();
    builder.push(`[namespace ${namespace.name}]  {${scope.name}}\n`);
    this.indent += 2;
    for (const ns of namespace.namespaces.values()) {
      builder.push(code`${this.ind()}${this.emitter.emitType(ns)}`);
    }

    for (const model of namespace.models.values()) {
      builder.push(code`${this.ind()}${this.emitter.emitType(model)}\n`);
    }

    for (const operation of namespace.operations.values()) {
      builder.push(code`${this.ind()}${this.emitter.emitType(operation)}\n`);
    }

    for (const enumeration of namespace.enums.values()) {
      builder.push(code`${this.ind()}${this.emitter.emitType(enumeration)}\n`);
    }

    for (const union of namespace.unions.values()) {
      builder.push(code`${this.ind()}${this.emitter.emitType(union)}\n`);
    }

    for (const iface of namespace.interfaces.values()) {
      builder.push(code`${this.ind()}${this.emitter.emitType(iface)}\n`);
    }

    for (const scalar of namespace.scalars.values()) {
      builder.push(code`${this.ind()}${this.emitter.emitType(scalar)}\n`);
    }

    this.indent -= 2;
    return this.emitter.result.declaration(namespace.name, builder.reduce());
  }

  numericLiteral(number: NumericLiteral): EmitterOutput<string> {
    console.log(`numericLiteral: ${number.value}`);
    return code`[Literal ${number.value.toString()}]`;
  }

  operationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    console.log(`operationDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`[Operation ${name}] {${scope.name}}`);
    builder.push(code`${this.emitter.emitOperationParameters(operation)}`);
    builder.push(code`${this.emitter.emitOperationReturnType(operation)}`);
    return builder.reduce();
  }

  operationParameters(operation: Operation, parameters: Model): EmitterOutput<string> {
    console.log(`operationParameters: ${operation.name}`);
    const builder = new StringBuilder();
    this.indent += 2;
    for (const param of parameters.properties.values()) {
      builder.push(code`\n${this.ind()}[Param ${this.emitter.emitModelProperty(param)}]`);
    }
    this.indent -= 2;
    return builder.reduce();
  }

  operationReturnType(operation: Operation, returnType: Type): EmitterOutput<string> {
    console.log(`operationReturnType: ${operation.name}`);
    this.indent += 2;
    const val = code`\n${this.ind()}[Return ${this.emitter.emitType(returnType)}]`;
    this.indent -= 2;
    return val;
  }

  scalarDeclaration(scalar: Scalar, name: string): EmitterOutput<string> {
    console.log(`scalarDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`[Scalar ${name}]`);
    if (scalar.baseScalar) {
      this.emitter.emitType(scalar.baseScalar);
    }
    return builder.reduce();
  }

  // TODO
  scalarInstantiation(scalar: Scalar, name: string | undefined): EmitterOutput<string> {
    console.log(`scalarInstantiation: ${name}`);
    return super.scalarInstantiation(scalar, name);
  }

  stringLiteral(string: StringLiteral): EmitterOutput<string> {
    console.log(`stringLiteral: ${string.value}`);
    return code`[Literal "${string.value}"]`;
  }

  // TODO
  stringTemplate(stringTemplate: StringTemplate): EmitterOutput<string> {
    console.log(`stringTemplate: ${stringTemplate}`);
    return super.stringTemplate(stringTemplate);
  }

  tupleLiteral(tuple: Tuple): EmitterOutput<string> {
    console.log(`tupleLiteral: ${tuple.values}`);
    const builder = new StringBuilder();
    builder.push(code`[Tuple ${this.emitter.emitTupleLiteralValues(tuple)}]`);
    return builder.reduce();
  }

  tupleLiteralValues(tuple: Tuple): EmitterOutput<string> {
    console.log(`tupleLiteralValues: ${tuple.values}`);
    const builder = new StringBuilder();
    this.indent += 2;
    for (const value of tuple.values) {
      builder.push(code`\n${this.ind()}${this.emitter.emitType(value)}`);
    }
    this.indent -= 2;
    return builder.reduce();
  }

  unionDeclaration(union: Union, name: string): EmitterOutput<string> {
    const context = this.emitter.getContext();
    const scope = context.scope;
    console.log(`unionDeclaration: ${name}`);
    const builder = new StringBuilder();
    builder.push(code`[Union ${name}] {${scope.name}}`);
    builder.push(code`${this.emitter.emitUnionVariants(union)}`);
    return this.emitter.result.declaration(name, builder.reduce());
  }

  // TODO
  unionInstantiation(union: Union, name: string): EmitterOutput<string> {
    console.log(`unionInstantiation: ${name}`);
    return super.unionInstantiation(union, name);
  }

  unionLiteral(union: Union): EmitterOutput<string> {
    console.log(`unionLiteral: ${union.name}`);
    const builder = new StringBuilder();
    builder.push(code`[Literal ${this.emitter.emitUnionVariants(union)}]`);
    return builder.reduce();
  }

  unionVariant(variant: UnionVariant): EmitterOutput<string> {
    console.log(`unionVariant: ${String(variant.name) ?? "unknown"}`);
    return code`[UnionVariant ${this.emitter.emitTypeReference(variant.type)}]`;
  }

  unionVariants(union: Union): EmitterOutput<string> {
    console.log(`unionVariants: ${union.name}`);
    const builder = new StringBuilder();
    this.indent += 2;
    for (const variant of union.variants.values()) {
      builder.push(code`\n${this.ind()}${this.emitter.emitType(variant)}`);
    }
    this.indent -= 2;
    return builder.reduce();
  }
}
