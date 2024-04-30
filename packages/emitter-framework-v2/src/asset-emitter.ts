import { EmitContext, Program, Type } from "@typespec/compiler";
import {
  AssetEmitter,
  AssetEmitterOptions,
  ContextState,
  EmitEntity,
  EmitterState,
  LexicalTypeStackEntry,
  SourceFile,
} from "./types.js";
import { CustomKeyMap } from "./custom-key-map.js";

export function createAssetEmitter<Output, Context extends object, Options extends object = Record<string, unknown>>(
  program: Program,
  init: EmitterInit<Output, Context>,
  emitContext: EmitContext<Context>,
): AssetEmitter<Output, Context, Options> {
  // TODO: From Tim's v2
  // const typeEmitter = { ...defaultHandlers, ...init };

  const sourceFiles: SourceFile<Output>[] = [];

  const options = {
    noEmit: program.compilerOptions.noEmit ?? false,
    emitterOutputDir: emitContext.emitterOutputDir,
    ...emitContext.options,
  };
  const typeId = CustomKeyMap.objectKeyer();
  const contextId = CustomKeyMap.objectKeyer();
  const entryId = CustomKeyMap.objectKeyer();

  // This is effectively a seen set, ensuring that we don't emit the same
  // type with the same context twice. So the map stores a triple of:
  //
  // 1. the method of TypeEmitter we would call
  // 2. the tsp type we're emitting.
  // 3. the current context.
  //
  // Note that in order for this to work, context needs to be interned so
  // contexts with the same values inside are treated as identical in the
  // map. See createInterner for more details.
  const typeToEmitEntity = new CustomKeyMap<[string, Type, ContextState<Context>], EmitEntity<Output>>(
    ([method, type, context]) => {
      return `${method}-${typeId.getKey(type)}-${contextId.getKey(context)}`;
    },
  );

  // When we encounter a circular reference, this map will hold a callback
  // that should be called when the circularly referenced type has completed
  // its emit.
  const waitingCircularRefs = new CustomKeyMap<
    [string, Type, ContextState<Context>],
    {
      state: EmitterState<Context>;
      cb: (entity: EmitEntity<Output>) => EmitEntity<Output>;
    }[]
  >(([method, type, context]) => {
    return `${method}-${typeId.getKey(type)}-${contextId.getKey(context)}`;
  });

  // Similar to `typeToEmitEntity`, this ensures we don't recompute context
  // for types that we already have context for. Note that context is
  // dependent on the context of the context call, e.g. if a model is
  // referenced with reference context set we need to get its declaration
  // context again. So we use the context's context as a key. Context must
  // be interned, see createInterner for more details.
  const knownContexts = new CustomKeyMap<[LexicalTypeStackEntry, ContextState<Context>], ContextState<Context>>(
    ([entry, context]) => {
      return `${entryId.getKey(entry)}-${contextId.getKey(context)}`;
    },
  );

  // The stack of types that the currently emitted type is lexically
  // contained in. This gets pushed to when we visit a type that is
  // lexically contained in the current type, and is reset when we jump via
  // reference to another type in a different lexical context. Note that
  // this does not correspond to tsp's lexical nesting, e.g. in the case of
  // an alias to a model expression, the alias is lexically outside the
  // model, but in the type graph we will consider it to be lexically inside
  // whatever references the alias.
  const lexicalTypeStack: LexicalTypeStackEntry[] = [];
  const referenceTypeChain: ReferenceChainEntry<Context>[] = [];

  // Internally, context is is split between lexicalContext and
  // referenceContext because when a reference is made, we carry over
  // referenceContext but leave lexical context behind. When context is
  // accessed by the user, they are merged by getContext().
  const context: ContextState<Context> = {
    lexicalContext: {} as any,
    referenceContext: {} as any,
  };
  const programContext: ContextState<Context> | null = null;

  // Incoming reference context is reference context that comes from emitting a
  // type reference. Incoming reference context is only set on the
  // incomingReferenceContextTarget and types lexically contained within it. For
  // example, when referencing a model with reference context set, we may need
  // to get context from the referenced model's namespaces, and such namespaces
  // will not see the reference context. However, the reference context will be
  // available for the model, its properties, and any types nested within it
  // (e.g. anonymous models).
  const incomingReferenceContext: Context | null = null;
  const incomingReferenceContextTarget: Type | null = null;
  const stateInterner = createInterner();
  const stackEntryInterner = createInterner();

  const resolveContext = (): Context => {
    return {
      ...context.lexicalContext,
      ...context.referenceContext,
    } as any;
  };

  const assetEmitter: AssetEmitter<Output, Context, Options> = {
    getOptions(): AssetEmitterOptions<Options> {
      return options;
    },

    getProgram() {
      return program;
    },
  };

  return assetEmitter;
}
