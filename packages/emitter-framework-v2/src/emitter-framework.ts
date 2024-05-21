import { Placeholder } from "./placeholder.js";
import { TypeEmitter, EmitterFrameworkOptions, OutputFile, Scope, DeclarationScope, FileScope } from "./types.js";
import { EmitContext, Program, Type, emitFile } from "@typespec/compiler";

export interface EmitterFramework<Output, Options extends object = Record<string, unknown>> {
  getProgram(): Program;
  getOptions(): EmitterFrameworkOptions<Options>;
  emitProgram(emitter?: string): void;
  emitType(type: Type, emitter?: string): void;

  declaration: {
    register(name: string, parent: Scope<Output>): DeclarationScope<Output>;
    get(name: string): DeclarationScope<Output> | undefined;
  };

  file: {
    register(path: string, emitMethod: () => Output): FileScope<Output>;
    append(path: string, value: string): void;
    get(path: string): FileScope<Output> | undefined;
    listAll(): FileScope<Output>[];
    write(path: string): void;
    writeAll(): void;
  };
}

export function initEmitterFramework<Output, Options extends object>(
  emitContext: EmitContext<Options>,
  TypeEmitters: TypeEmitter<Output, Options> | Map<string, TypeEmitter<Output, Options>>,
): EmitterFramework<Output, Options> {
  const options = {
    noEmit: emitContext.program.compilerOptions.noEmit ?? false,
    emitterOutputDir: emitContext.emitterOutputDir,
    ...emitContext.options,
  };

  const emitters = new Map<string, TypeEmitter<Output, Options>>();
  if (TypeEmitters instanceof Map) {
    for (const [key, value] of TypeEmitters) {
      emitters.set(key, value);
    }
  } else {
    emitters.set("default", TypeEmitters);
  }
  const declarations = new Map<string, DeclarationScope<Output>>();
  const files = new Map<string, FileScope<Output>>();

  const emitterFramework: EmitterFramework<Output, Options> = {
    getProgram() {
      return emitContext.program;
    },

    getOptions() {
      return options;
    },

    emitProgram(emitter?: string) {
      function emitProgramWithEmitter(typeEmitter: TypeEmitter<Output, Options>) {
        const namespace = emitContext.program.getGlobalNamespaceType();
        // if (options?.emitGlobalNamespace) {
        //   this.emitType(namespace);
        //   return;
        // }
        // for (const ns of namespace.namespaces.values()) {
        //   if (ns.name === "TypeSpec" && !options?.emitTypeSpecNamespace) continue;
        //   this.emitType(ns);
        // }
        // for (const model of namespace.models.values()) {
        //   if (!isTemplateDeclaration(model)) {
        //     this.emitType(model);
        //   }
        // }
        // for (const operation of namespace.operations.values()) {
        //   if (!isTemplateDeclaration(operation)) {
        //     this.emitType(operation);
        //   }
        // }
        for (const enumeration of namespace.enums.values()) {
          emitterFramework.emitType(enumeration, emitter);
        }
        // for (const union of namespace.unions.values()) {
        //   if (!isTemplateDeclaration(union)) {
        //     this.emitType(union);
        //   }
        // }
        // for (const iface of namespace.interfaces.values()) {
        //   if (!isTemplateDeclaration(iface)) {
        //     this.emitType(iface);
        //   }
        // }
        // for (const scalar of namespace.scalars.values()) {
        //   this.emitType(scalar);
        // }
      }

      if (emitter) {
        const emitterInstance = emitters.get(emitter);
        if (!emitterInstance) {
          // FIXME: Diagnostic, not error?
          throw new Error(`Emitter ${emitter} not found`);
        }
        emitProgramWithEmitter(emitterInstance);
        return;
      } else {
        // run all emitters
        for (const emitter of emitters.values()) {
          emitProgramWithEmitter(emitter);
        }
      }
    },

    emitType(type: Type, emitter?: string) {
      // TODO: Implement
    },

    declaration: {
      register(name: string, parent: Scope<Output>): DeclarationScope<Output> {
        const decl: DeclarationScope<Output> = {
          kind: "declaration",
          name,
          parent,
          declarations: [],
          value: new Placeholder<Output>(),
          meta: {},
        };
        parent.declarations.push(decl);
        return decl;
      },

      get(name: string): DeclarationScope<Output> | undefined {
        const decl = declarations.get(name);
        return decl;
      },
    },

    file: {
      register(path: string, emitMethod: () => Output) {
        const file: OutputFile<Output> = {
          path,
          emit: emitMethod,
          imports: new Map(),
          meta: {},
        };
        const fileScope: FileScope<Output> = {
          kind: "file",
          name: path,
          parent: null,
          declarations: [],
          file,
        };
        files.set(path, fileScope);
        return fileScope;
      },

      get(path: string): FileScope<Output> | undefined {
        return files.get(path);
      },

      async write(path: string) {
        const fileScope = files.get(path);
        if (options.noEmit || !fileScope) {
          return;
        }
        const output = fileScope.file.emit();
        await emitFile(emitterFramework.getProgram(), {
          path: path,
          content: output as string,
        });
      },

      append(path: string, value: string) {
        const file = files.get(path);
        if (!file) {
          // FIXME: Diagnostic?
          throw new Error(`File ${path} not found`);
        }
        // TODO: How and what to append?
      },

      listAll(): FileScope<Output>[] {
        return [...files.values()];
      },

      async writeAll() {
        for (const path of files.keys()) {
          await emitterFramework.file.write(path);
        }
      },
    },
  };
  return emitterFramework;
}
