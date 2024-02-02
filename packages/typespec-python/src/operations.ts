import {
  AssetEmitter,
  Context,
  EmittedSourceFile,
  EmitterOutput,
  SourceFile,
  StringBuilder,
  code,
} from "@typespec/compiler/emitter-framework";
import { PythonPartialEmitter } from "./python.js";
import { Model, Namespace, Operation, Program, Type } from "@typespec/compiler";
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
    const namespace = this.buildImportPathForNamespace(operation.namespace);
    const fullPath = namespace === undefined ? pythonName : `${namespace}._operations`;
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

  operationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    const pythonName = this.transformReservedName(this.toSnakeCase(name));
    const interfaceValue = this.operationDeclarationInterface(operation, name);
    const implementationValue = this.operationDeclarationImplementation(operation, name);
    const decl = this.declarations!.declare(this, {
      name: pythonName,
      kind: DeclarationKind.Operation,
      value: interfaceValue,
      omit: false,
    });
    const path = `${this.buildNamespaceFromScope(decl.scope)}.${pythonName}`;
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
        this.imports.add(".models", param.type.name);
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
      this.imports.add(".models", returnType.name);
    }
    return value;
  }

  interfaceOperationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
    const opName = `${operation.interface!.name}_${name}`;
    return this.operationDeclaration(operation, opName);
  }

  /** Returns true of the strings are equal, ignoring the last segment. Applies only to dot-separated strings. */
  #rootsAreEqual(p1: string, p2: string): boolean {
    return p1.split(".").slice(0, -1).join(".") === p2.split(".").slice(0, -1).join(".");
  }

  async buildImplementationFile(sourceFile: SourceFile<string>): Promise<EmittedSourceFile | undefined> {
    const pathRoot = sourceFile.path.split("/").slice(0, -1).join("/");
    let path = `${pathRoot}/_operations.py`;
    // createSourceFile prepends emitterOutputDir to the path, so remove it, if present.
    const emitterOutputDir = this.emitter.getOptions().emitterOutputDir;
    if (path.startsWith(emitterOutputDir)) {
      path = path.substring(emitterOutputDir.length + 1);
    }
    try {
      // check if path already exists. If so, return undefined.
      await this.emitter.getProgram().host.readFile(path);
      return undefined;
    } catch (e) {
      // file does not exist, so we can create it
      const implFile = this.emitter.createSourceFile(path);
      const implSf = await this.emitter.emitSourceFile(implFile);
      const builder = new StringBuilder();
      const importPath = this.buildImportPathForFilePath(path) ?? "_operations";
      const opImports = this.imports.get(sourceFile, ImportKind.regular);
      for (const [module, metadata] of opImports) {
        const names = Array.from(metadata).map((meta) => meta.name);
        builder.push(`from ${module} import ${[...names].join(", ")}\n`);
      }
      if (opImports.size > 0) {
        builder.push("\n");
      }
      for (const [path, meta] of this.operationMetadata.entries()) {
        if (this.#rootsAreEqual(path, importPath)) {
          builder.push(`${meta.implementation}\n`);
        }
      }
      implSf.contents = builder.reduce() + "\n";
      return implSf;
    }
  }
}
