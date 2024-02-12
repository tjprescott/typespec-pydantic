import {
  AssetEmitter,
  Context,
  EmittedSourceFile,
  EmitterOutput,
  Placeholder,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { GlobalNamespace, PythonPartialEmitter } from "./python.js";
import { Model, Namespace, Operation, Program, Type, emitFile } from "@typespec/compiler";
import { DeclarationKind, DeclarationManager } from "./declaration-util.js";
import { ImportKind } from "./import-util.js";
import { getOperationParameters } from "@typespec/http";

interface OperationParameterOptions {
  /** operation parameters should display type info */
  displayTypes?: boolean;
}

interface OperationMetadata {
  interface: string;
  implementation: string;
}

export abstract class PythonPartialOperationEmitter extends PythonPartialEmitter {
  private fileName = "operations.py";

  protected operationMetadata: Map<string, OperationMetadata> = new Map();

  abstract emitRoute(builder: StringBuilder, operation: Operation): void;

  /** A method that is called when generating operation implementations.
   * Allows the emitter to decide whether the implementation needs the provided imports.
   * Return true to filter out the import or false to include it. */
  abstract shouldOmitImport(module: string): boolean;

  constructor(emitter: AssetEmitter<string, Record<string, never>>, declarations?: DeclarationManager) {
    super(emitter);
    this.declarations = declarations;
  }

  programContext(program: Program): Context {
    return this.createProgramContext(this.fileName);
  }

  namespaceContext(namespace: Namespace): Context {
    return this.createNamespaceContext(namespace, this.fileName);
  }

  private operationDeclarationInterface(operation: Operation, name: string): string {
    const pythonName = this.transformReservedName(this.toSnakeCase(name));
    const builder = new StringBuilder();
    this.emitDocs(builder, operation);
    this.emitRoute(builder, operation);
    builder.push(`def ${pythonName}(`);
    const params = getOperationParameters(this.emitter.getProgram(), operation);
    if (params.length > 0) {
      builder.push(code`${this.operationParameters(operation, operation.parameters, { displayTypes: true })}`);
    }
    builder.push(`)`);
    if (operation.returnType !== undefined) {
      const returnType = this.operationReturnType(operation, operation.returnType);
      if (returnType !== "") {
        builder.push(code` -> ${returnType}`);
      }
    }
    builder.push(":\n");
    builder.push(
      `${this.indent(1)}return _${pythonName}(${this.operationParameters(operation, operation.parameters, { displayTypes: false })})\n`,
    );
    const namespace = this.importPathForNamespace(operation.namespace);
    const fullPath = namespace === GlobalNamespace ? `_operations` : `${namespace}._operations`;
    this.imports.add(fullPath, `_${pythonName}`);
    return `${builder.reduce()}`;
  }

  private operationDeclarationImplementation(operation: Operation, name: string): string {
    const pythonName = `_${this.transformReservedName(this.toSnakeCase(name))}`;
    const builder = new StringBuilder();
    builder.push(`def ${pythonName}(`);
    const params = getOperationParameters(this.emitter.getProgram(), operation);
    if (params.length > 0) {
      builder.push(code`${this.operationParameters(operation, operation.parameters, { displayTypes: true })}`);
    }
    builder.push(`)`);
    if (operation.returnType !== undefined) {
      const returnType = this.operationReturnType(operation, operation.returnType);
      if (returnType !== "") {
        builder.push(code` -> ${returnType}`);
      }
    }
    builder.push(":\n");
    builder.push(
      `${this.indent(1)}# TODO: Implement this\n${this.indent(1)}raise NotImplementedError("Implement ${pythonName}")\n`,
    );
    return `${builder.reduce()}`;
  }

  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    const namespace = this.importPathForNamespace(model.namespace);
    const fullPath = namespace === GlobalNamespace ? name : `${namespace}.${name}`;
    const existing = this.declarations!.get({ path: fullPath })[0];
    if (existing) {
      return existing.decl ?? this.emitter.result.none();
    } else {
      return this.declarations!.declare(this, {
        name: name,
        namespace: model.namespace,
        kind: DeclarationKind.Model,
        value: undefined,
        omit: true,
        globalImportPath: "models",
      });
    }
  }

  operationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    const pythonName = this.transformReservedName(this.toSnakeCase(name));
    const interfaceValue = this.operationDeclarationInterface(operation, name);
    const implementationValue = this.operationDeclarationImplementation(operation, name);
    const decl = this.declarations!.declare(this, {
      name: pythonName,
      namespace: operation.namespace,
      kind: DeclarationKind.Operation,
      value: interfaceValue,
      omit: false,
      globalImportPath: "operations",
    });
    const opNs = this.buildNamespaceFromScope(decl.scope);
    const path = `${String(opNs)}.${pythonName}`;
    this.operationMetadata.set(path, { interface: interfaceValue, implementation: implementationValue });
    return decl;
  }

  operationParameters(
    operation: Operation,
    parameters: Model,
    options?: OperationParameterOptions,
  ): EmitterOutput<string> {
    const builder = new StringBuilder();
    let i = 0;
    const length = parameters.properties.size;
    for (const param of parameters.properties.values()) {
      const paramName = this.transformReservedName(this.toSnakeCase(param.name));
      const paramType = this.emitter.emitTypeReference(param.type);
      if (param.type.kind === "Model" && param.type.name !== "Array") {
        const modelPath = this.importPathForNamespace(param.type.namespace);
        this.imports.add(modelPath === GlobalNamespace ? "models" : modelPath, param.type.name);
      }
      builder.push(code`${paramName}`);
      if (options?.displayTypes ?? true) {
        builder.push(code`: ${paramType}`);
      }
      if (++i < length) builder.push(code`, `);
    }
    return builder.reduce();
  }

  operationReturnType(operation: Operation, returnType: Type): EmitterOutput<string> {
    const value = code`${this.emitter.emitTypeReference(operation.returnType)}`;
    if (returnType.kind === "Model" && returnType.name !== "Array") {
      const modelPath = this.importPathForNamespace(returnType.namespace);
      this.imports.add(modelPath === GlobalNamespace ? "models" : modelPath, returnType.name);
    }
    return value;
  }

  interfaceOperationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    const opName = `${operation.interface!.name}_${name}`;
    return this.operationDeclaration(operation, opName);
  }

  /** Returns true of the strings are equal, ignoring the last segment. Applies only to dot-separated strings. */
  #rootsAreEqual(p1: string, p2: string): boolean {
    let p1Root = p1.split(".").slice(0, -1).join(".");
    let p2Root = p2.split(".").slice(0, -1).join(".");
    p1Root = p1Root === "" ? String(GlobalNamespace) : p1Root;
    p2Root = p2Root === "" ? String(GlobalNamespace) : p2Root;
    return p1Root === p2Root;
  }

  async buildImplementationFile(sourceFile: SourceFile<string>): Promise<EmittedSourceFile | undefined> {
    const pathRoot = sourceFile.path.split("/").slice(0, -1).join("/");
    let path = `${pathRoot}/_operations.py`;
    try {
      // check if path already exists. If so, return undefined.
      await this.emitter.getProgram().host.readFile(path);
      return undefined;
    } catch (e) {
      // createSourceFile prepends emitterOutputDir to the path, so remove it, if present.
      const emitterOutputDir = this.emitter.getOptions().emitterOutputDir;
      if (path.startsWith(emitterOutputDir)) {
        path = path.substring(emitterOutputDir.length + 1);
      }

      // file does not exist, so we can create it
      const implFile = this.emitter.createSourceFile(path);
      const implSf = await this.emitter.emitSourceFile(implFile);
      const builder = new StringBuilder();
      const importPath = this.importPathForFilePath(path) ?? "_operations";
      const opImports = this.imports.get(sourceFile, ImportKind.regular);
      for (const [module, metadata] of opImports) {
        if (this.shouldOmitImport(module)) {
          continue;
        }
        const names = Array.from(metadata).map((meta) => meta.name);
        builder.push(`from ${module} import ${[...names].join(", ")}\n`);
      }
      if (opImports.size > 0) {
        builder.push("\n");
      }
      for (const [path, meta] of this.operationMetadata.entries()) {
        if (this.#rootsAreEqual(path, String(importPath))) {
          builder.push(`${meta.implementation}\n`);
        }
      }
      implSf.contents = builder.reduce() + "\n";
      return implSf;
    }
  }

  emitTypeReference(type: Type) {
    const destNs = this.importPathForNamespace((type as Model).namespace);
    if (destNs !== "type_spec" && type.kind === "Model") {
      const templateArgs = type.templateMapper?.args;
      if (templateArgs === undefined || templateArgs.length === 0) {
        this.imports.add(destNs === GlobalNamespace ? "models" : destNs, type.name);
      }
    }
    const value = this.emitter.emitTypeReference(type);
    if (value.kind === "code" && value.value instanceof Placeholder && (value.value as any).segments === undefined) {
      return code`"${value}"`;
    }
    return code`${value}`;
  }

  async writeOutput(sourceFiles: SourceFile<string>[]): Promise<void> {
    const toEmit: EmittedSourceFile[] = [];
    for (const file of sourceFiles) {
      // don't emit empty files
      const decls = this.declarations!.get({ kind: DeclarationKind.Operation, sourceFile: file });
      if (decls.length === 0) continue;

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
}
