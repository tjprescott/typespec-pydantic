import { BooleanLiteral, EmitContext, Enum, EnumMember, Interface, IntrinsicType, Model, ModelProperty, NumericLiteral, Operation, Program, Scalar, StringLiteral, Tuple, Type, Union, UnionVariant } from "@typespec/compiler";
import { CodeTypeEmitter, Context, Declaration, EmitEntity, EmittedSourceFile, EmitterOutput, Scope, SourceFile, StringBuilder, code } from "@typespec/compiler/emitter-framework";
import { PydanticEmitterOptions } from "./lib.js";

export async function $onEmit(context: EmitContext<PydanticEmitterOptions>) {
    const assetEmitter = context.getAssetEmitter(PydanticEmitter);

    assetEmitter.emitProgram();

    await assetEmitter.writeOutput();
}

class PydanticEmitter extends CodeTypeEmitter {

    static readonly PYTHON_INDENT = "    ";
    static readonly PYDANTIC_HEADER = `from pydantic import *\nfrom typing import *`;

    programContext(program: Program): Context {
        const options = this.emitter.getOptions();
        const outFile = options["output-file"] ?? "out.py";
        const sourceFile = this.emitter.createSourceFile(outFile);
        return {
            scope: sourceFile.globalScope,
        };
    }

    sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
        const emittedSourceFile: EmittedSourceFile = {
            path: sourceFile.path,
            contents: PydanticEmitter.PYDANTIC_HEADER + "\n\n",
        };

        for (const decl of sourceFile.globalScope.declarations) {
            emittedSourceFile.contents += decl.value + "\n\n";
        }

        return emittedSourceFile;
    }

    modelDeclaration(model: Model, name: string): EmitterOutput<string> {
        const props = this.emitter.emitModelProperties(model);
        const modelCode = code`class ${name}(BaseModel):\n${props}`;
        return this.emitter.result.declaration(name, modelCode);
    }

    modelLiteral(model: Model): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    modelInstantiation(model: Model, name: string | undefined): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    modelProperties(model: Model): EmitterOutput<string> {
        const builder = new StringBuilder();
        for (const prop of model.properties.values()) {
            builder.push(code`${PydanticEmitter.PYTHON_INDENT}${this.emitter.emitModelProperty(prop)}\n`);
        }
        return this.emitter.result.rawCode(builder.reduce());
    }

    modelPropertyLiteral(property: ModelProperty): EmitterOutput<string> {
        return code`${property.name}: ${this.emitter.emitTypeReference(property.type)}`;
    }

    modelPropertyReference(property: ModelProperty): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    enumDeclaration(en: Enum, name: string): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    enumMember(member: EnumMember): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    enumMemberReference(member: EnumMember): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    arrayDeclaration(array: Model, name: string, elementType: Type): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    arrayLiteral(array: Model, elementType: Type): EmitterOutput<string> {
        return code`List[${this.emitter.emitTypeReference(elementType)}]`;
    }

    booleanLiteral(boolean: BooleanLiteral): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    numericLiteral(number: NumericLiteral): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    stringLiteral(string: StringLiteral): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    intrinsic(intrinsic: IntrinsicType, name: string): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    scalarDeclaration(scalar: Scalar, name: string): EmitterOutput<string> {
        switch (scalar.name) {
            case "string":
                return "str";
            case "int16":
            case "int32":
            case "int64":
                return "int"
            default:
                return code`${scalar.name}`;
        }
    }

    scalarInstantiation(scalar: Scalar, name: string | undefined): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    operationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    operationReturnType(operation: Operation, returnType: Type): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    interfaceDeclaration(iface: Interface, name: string): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    interfaceOperationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    tupleLiteral(tuple: Tuple): EmitterOutput<string> {
        const builder = new StringBuilder();
        let i = 0;
        const length = tuple.values.length;
        builder.push(code`Tuple[`);
        for (const item of tuple.values) {
            builder.push(code`${this.emitter.emitTypeReference(item)}`);
            if (++i < length)
                builder.push(code`, `);
            else
                builder.push(code`]`);
        }
        return builder.reduce();
    }

    unionDeclaration(union: Union, name: string): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    unionInstantiation(union: Union, name: string): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    unionLiteral(union: Union): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }

    unionVariant(variant: UnionVariant): EmitterOutput<string> {
        throw new Error("Method not implemented.");
    }
}
