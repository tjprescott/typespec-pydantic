import { Enum, Interface, IntrinsicType, Model, Operation, Program, Scalar, Type, Union } from "@typespec/compiler";
import { Placeholder } from "./placeholder.js";

export type AssetEmitterOptions<Options extends object> = {
  noEmit: boolean;
  emitterOutputDir: string;
} & Options;

interface EmitTypeReferenceOptions<Context extends object> {
  readonly referenceContext?: Context;
}

export interface AssetEmitter<Output, Context extends object, Options extends object = Record<string, unknown>> {
  // TODO: EFv1 had this...
  // getContext(): Context;

  // Generic getters
  getOptions(): AssetEmitterOptions<Options>;
  getProgram(): Program;

  // Generic emit methods
  emitTypeReference(type: Type, options?: EmitTypeReferenceOptions<Context>): EmitEntity<Output>;
  emitDeclarationName(type: TypeSpecDeclaration): string | undefined;
  emitType(type: Type, context?: Partial<ContextState<Context>>): EmitEntity<Output>;
  emitProgram(options?: { emitGlobalNamespace?: boolean; emitTypeSpecNamespace?: boolean }): void;

  // FIXME: Why are any of these here? Weird non-standard emit methods that don't seem like they should exist.
  // emitModelProperties(model: Model): EmitEntity<Output>;
  // emitModelProperty(prop: ModelProperty): EmitEntity<Output>;
  // emitOperationParameters(operation: Operation): EmitEntity<Output>;
  // emitOperationReturnType(operation: Operation): EmitEntity<Output>;
  // emitInterfaceOperations(iface: Interface): EmitEntity<Output>;
  // emitInterfaceOperation(operation: Operation): EmitEntity<Output>;
  // emitEnumMembers(en: Enum): EmitEntity<Output>;
  // emitUnionVariants(union: Union): EmitEntity<Output>;
  // emitTupleLiteralValues(tuple: Tuple): EmitEntity<Output>;

  // Source file methods
  emitSourceFile(sourceFile: SourceFile<Output>): Promise<EmittedSourceFile>;
  createSourceFile(name: string): SourceFile<Output>;
  getSourceFiles(): SourceFile<Output>[];
  writeOutput(): Promise<void>;

  // Scope methods
  createScope(sourceFile: SourceFile<Output>, name: string): SourceFileScope<Output>;
  createScope(namespace: any, name: string, parentScope: Scope<Output>): NamespaceScope<Output>;
  createScope(block: any, name: string, parentScope?: Scope<Output> | null): Scope<Output>;

  // FIXME: Why do we need these?
  // result: {
  //   declaration(name: string, value: Output | Placeholder<Output>): Declaration<Output>;
  //   rawCode(value: Output | Placeholder<Output>): RawCode<Output>;
  //   none(): NoEmit;
  // };
}

export interface ContextState<Context extends object> {
  lexicalContext: Context;
  referenceContext: Context;
}

export type EmitEntity<T> = Declaration<T> | RawCode<T> | NoEmit | CircularEmit;

export interface SourceFile<T> {
  path: string;
  globalScope: Scope<T>;
  imports: Map<string, string[]>;
  meta: Record<string, any>;
}

interface ScopeBase<T> {
  kind: string;
  name: string;
  parentScope: Scope<T> | null;
  childScopes: Scope<T>[];
  declarations: Declaration<T>[];
}

interface SourceFileScope<T> extends ScopeBase<T> {
  kind: "sourceFile";
  sourceFile: SourceFile<T>;
}

interface NamespaceScope<T> extends ScopeBase<T> {
  kind: "namespace";
  parentScope: Scope<T>;
  namespace: any;
}

type Scope<T> = SourceFileScope<T> | NamespaceScope<T>;

interface EmittedSourceFile {
  contents: string;
  path: string;
}

type TypeSpecDeclaration = Model | Interface | Union | Operation | Enum | Scalar | IntrinsicType;

/** Structure referencing type and context used to create a declaration  */
export interface DeclarationSource<Context extends object = object> {
  readonly type: Type;
  readonly context: Context;
}
export class EmitterResult {}
export class Declaration<T, Context extends object = object> extends EmitterResult {
  public kind = "declaration" as const;
  public meta: Record<string, any> = {};

  constructor(
    public readonly name: string,
    public readonly scope: Scope<T>,
    public value: T | Placeholder<T>,
    public readonly source: DeclarationSource<Context>,
  ) {
    if (value instanceof Placeholder) {
      value.onValue((v) => (this.value = v));
    }

    super();
  }
}

export class RawCode<T> extends EmitterResult {
  public kind = "code" as const;

  constructor(public value: T | Placeholder<T>) {
    if (value instanceof Placeholder) {
      value.onValue((v) => (this.value = v));
    }

    super();
  }
}

export class NoEmit extends EmitterResult {
  public kind = "none" as const;
}

export class CircularEmit extends EmitterResult {
  public kind = "circular" as const;
  constructor(public emitEntityKey: [string, Type, ContextState<any>]) {
    super();
  }
}

export interface EmitterState<Context extends object> {
  lexicalTypeStack: LexicalTypeStackEntry[];
  context: ContextState<Context>;
}

// TODO: EFv2 version...
// export interface LexicalTypeStackEntry<T extends TypeHookMethod = TypeHookMethod> {
//   method: T;
//   args: TypeHooksParams[T];
// }

export interface LexicalTypeStackEntry<T extends object = object> {
  method: T;
  args: any[];
}
