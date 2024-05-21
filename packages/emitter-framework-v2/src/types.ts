import { Model, Type } from "@typespec/compiler";
import { Placeholder } from "./placeholder.js";

export type EmitterFrameworkOptions<TOptions extends object> = {
  noEmit: boolean;
  emitterOutputDir: string;
} & TOptions;

export interface TypeEmitter<Output, Options extends object = Record<string, never>> {
  unhandledType(type: Type): void;
  model?: {
    declaration?: ((model: Model, name: string) => void) | null;
    literal?: ((model: Model) => void) | null;
    instantiation?: ((model: Model, name: string | undefined) => void) | null;
  } | null;
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
