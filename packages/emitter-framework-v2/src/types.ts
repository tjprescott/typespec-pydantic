import { Model, Program, Type, ModelProperty, EnumMember, Namespace, TemplateParameter } from "@typespec/compiler";
import { Placeholder } from "./placeholder.js";

export type EmitterFrameworkOptions<TOptions extends object> = {
  noEmit: boolean;
  emitterOutputDir: string;
} & TOptions;

type Context = Record<string, any>;

export interface TypeEmitter<Output, Options extends object = Record<string, never>> {
  context?: (program: Program) => Context;
  unhandled: Unhandled;
  reference: References;
  namespace?: Namespaces | null;
  model?: Models | null;
}

export interface OutputFile<Output> {
  path: string;
  emit: () => Output;
  imports: Map<string, Set<string>>;
  meta: Record<string, any>;
}

export type Scope<T> = FileScope<T> | DeclarationScope<T>;
export interface ScopeBase<T> {
  kind: string;
  name: string;
  parent: Scope<T> | null;
  declarations: DeclarationScope<T>[];
}

export interface FileScope<T> extends ScopeBase<T> {
  kind: "file";
  parent: null;
  file: OutputFile<T>;
}

export interface DeclarationScope<T> extends ScopeBase<T> {
  kind: "declaration";
  parent: Scope<T>;
  value: T | Placeholder<T>;
  meta: Record<string, any>;
}

type EmitterResult = string;
type EmitEntity = string;

export type UnhandledKind = "type" | "reference";
export interface Unhandled {
  context?: (type: Type, kind: UnhandledKind) => Context;
  type: ((type: Type) => EmitterResult) | null;
  reference: ((type: Type) => EmitterResult) | null;
}

export interface References {
  type: (
    targetDeclaration: string,
    pathUp: Scope<string>[],
    pathDown: Scope<string>[],
    commonScope: Scope<string> | null,
  ) => string | EmitEntity;
  circular: (target: string, scope: Scope<string> | undefined, cycle: string) => string | EmitEntity;
  modelProperty?: ((property: ModelProperty) => EmitterResult) | null;
  enumMember?: ((member: EnumMember) => EmitterResult) | null;
}

export interface Namespaces {
  context?: (ns: Namespace) => Context;
  declaration?: ((ns: Namespace) => EmitterResult) | null;
}

export type ModelKind = "declaration" | "templateDeclaration" | "instantiation" | "properties" | "property";
export interface Models {
  context?: (model: Model, kind: ModelKind) => Context;
  declaration?: ((model: Model, name: string) => EmitterResult) | null;
  templateDeclaration?: ((model: Model, parameters: TemplateParameter[], name: string) => EmitterResult) | null;
  instantiation?: ((model: Model, name: string | undefined) => EmitterResult) | null;
  properties?: ((model: Model, properties: ModelProperty[]) => EmitterResult) | null;
  property?: ((model: Model, property: ModelProperty) => EmitterResult) | null;
}
