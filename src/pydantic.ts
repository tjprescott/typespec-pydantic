import { BooleanLiteral, EmitContext, Enum, EnumMember, Interface, IntrinsicType, Model, ModelProperty, NumericLiteral, Operation, Program, Scalar, StringLiteral, Tuple, Type, Union, UnionVariant, isIntrinsicType } from "@typespec/compiler";
import { CodeTypeEmitter, Context, EmitEntity, EmittedSourceFile, EmitterOutput, SourceFile, StringBuilder, code } from "@typespec/compiler/emitter-framework";
import { PydanticEmitterOptions, reportDiagnostic } from "./lib.js";
import { report } from "process";

export async function $onEmit(context: EmitContext<PydanticEmitterOptions>) {
    const assetEmitter = context.getAssetEmitter(PydanticEmitter);

    assetEmitter.emitProgram();

    await assetEmitter.writeOutput();
}

interface UnionVariantMetadata {
    type: Type,
    value: string | StringBuilder,
}


class PydanticEmitter extends CodeTypeEmitter {

    static readonly pythonIndent = "    ";
    // TODO: Imports should be handled dynamically
    static readonly pydanticHeader = `from pydantic import *\nfrom typing import *\nfrom datetime import *\nfrom decimal import *\nfrom enum import Enum`;

    static readonly reservedKeywords = [
        "and", "as", "assert", "break", "class", "continue", "def", "del",
        "elif", "else", "except", "False", "finally", "for", "from", "global",
        "if", "import", "in", "is", "lambda", "None", "nonlocal", "not", "or",
        "pass", "raise", "return", "True", "try", "while", "with", "yield"
    ];

    #getBaseScalar(type: Scalar): Scalar {
        if (type.baseScalar !== undefined) {
            return this.#getBaseScalar(type.baseScalar);
        }
        return type;
    }

    #isLiteral(type: Type): boolean {
        return !["Scalar", "Enum", "Union", "Model", "Tuple", "UnionVariant", "EnumMember", "ModelProperty", "Intrinsic"].includes(type.kind);
    }

    /// Converts camelCase name to snake_case.
    #toSnakeCase(name: string): string {
        return name.replace(/([A-Z])/g, "_$1").toLowerCase();
    }

    /// Transforms names that start with numbers or are reserved keywords.
    #checkName(name: string): string {

        if (PydanticEmitter.reservedKeywords.includes(name)) {
            return `${name}_`;
        } else if (name.match(/^\d/)) {
            return `_${name}`;
        }
        return name;
    }

    /// Returns true if the type is an array or has a source model that is an array.
    #isArray(type: Type): boolean {
        if (type.kind === "Model" && type.sourceModel !== undefined) {
            return this.#isArray(type.sourceModel);
        }
        return type.kind === "Model" && type.name === "Array";
    }

    #findArrayElement(model: Model): Type | undefined {
        if (model.sourceModel !== undefined) {
            return this.#findArrayElement(model.sourceModel);
        }
        if (model.name === "Array") {
            return model.indexer!.value;
        }
        return undefined;
    }

    programContext(program: Program): Context {
        const options = this.emitter.getOptions();
        const outFile = options["output-file"] ?? "models.py";
        const sourceFile = this.emitter.createSourceFile(outFile);
        return {
            scope: sourceFile.globalScope,
        };
    }

    sourceFile(sourceFile: SourceFile<string>): EmittedSourceFile | Promise<EmittedSourceFile> {
        const emittedSourceFile: EmittedSourceFile = {
            path: sourceFile.path,
            contents: PydanticEmitter.pydanticHeader + "\n\n",
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
        const program = this.emitter.getProgram();
        reportDiagnostic(program, {
            code: "anonymous-model",
            target: model
        })
        return code`object`;
    }

    modelInstantiation(model: Model, name: string | undefined): EmitterOutput<string> {
        if (model.name === "Record") {
            const type = model.templateMapper?.args[0];
            return code`Dict[str, ${type ? this.emitter.emitTypeReference(type) : "None"}]`;
        } else {
            reportDiagnostic(this.emitter.getProgram(), {
                code: "template-instantiation",
                target: model
            });
            return code`${this.#checkName(model.name)}`;
        }
    }

    modelProperties(model: Model): EmitterOutput<string> {
        const builder = new StringBuilder();
        for (const prop of model.properties.values()) {
            builder.push(code`${PydanticEmitter.pythonIndent}${this.emitter.emitModelProperty(prop)}\n`);
        }
        return this.emitter.result.rawCode(builder.reduce());
    }

    modelPropertyLiteral(property: ModelProperty): EmitterOutput<string> {
        const builder = new StringBuilder();
        const isOptional = property.optional;``
        let type: EmitEntity<string> | undefined = undefined;
        type = this.emitter.emitTypeReference(property.type);
        // don't emit anything if type is `never`
        if (property.type.kind === "Intrinsic" && property.type.name === "never") return code``;

        const isLiteral = this.#isLiteral(property.type);
        builder.push(code`${this.#toSnakeCase(this.#checkName(property.name))}: `);
        if (isOptional) {
            builder.push(code`Optional[`);
        }
        if (isLiteral) {
            builder.push(code`Literal[`);
        }
        if (this.#isArray(property.type) && property.type.kind === "Model") {
            const arrayElement = this.#findArrayElement(property.type);
            if (arrayElement !== undefined) {
                builder.push(code`List[${this.emitter.emitTypeReference(arrayElement)}]`);
            }
        } else if (property.type.kind === "Union") {
            builder.push(code`${this.emitter.emitUnionVariants(property.type)}`);
        } else if (property.type.kind === "UnionVariant") {
            builder.push(code`${this.emitter.emitTypeReference(property.type.type)}`);
        } else {
            builder.push(code`${type}`);
        }
        if (isLiteral) {
            builder.push(code`]`);
        }
        if (isOptional) {
            builder.push(code`]`);
        }
        return builder.reduce();
    }

    modelPropertyReference(property: ModelProperty): EmitterOutput<string> {
        return code`${this.emitter.emitTypeReference(property.type)}`;
    }

    enumDeclaration(en: Enum, name: string): EmitterOutput<string> {
        const members = this.emitter.emitEnumMembers(en);
        const enumCode = code`class ${name}(Enum):\n${members}`;
        return this.emitter.result.declaration(name, enumCode);
    }

    enumMembers(en: Enum): EmitterOutput<string> {
        const builder = new StringBuilder();
        for (const member of en.members.values()) {
            builder.push(code`${PydanticEmitter.pythonIndent}${this.emitter.emitType(member)}\n`);
        }
        return this.emitter.result.rawCode(builder.reduce());
    }

    enumMember(member: EnumMember): EmitterOutput<string> {
        const builder = new StringBuilder();
        builder.push(code`${this.#toSnakeCase(member.name).toUpperCase()}`);
        builder.push(code` = "${member.value !== undefined ? member.value.toString() : this.#checkName(member.name)}"`);
        return builder.reduce();
    }

    enumMemberReference(member: EnumMember): EmitterOutput<string> {
        return code`Literal[${member.enum.name}.${this.#toSnakeCase(member.name).toUpperCase()}]`;
    }

    arrayDeclaration(array: Model, name: string, elementType: Type): EmitterOutput<string> {
        reportDiagnostic(this.emitter.getProgram(), {
            code: "array-declaration-unsupported",
            target: array
        });
        return this.emitter.result.declaration(name, '');
    }

    arrayLiteral(array: Model, elementType: Type): EmitterOutput<string> {
        return code`List[${this.emitter.emitTypeReference(elementType)}]`;
    }

    booleanLiteral(boolean: BooleanLiteral): EmitterOutput<string> {
        const val = boolean.value.toString();
        return code`${val.charAt(0).toUpperCase()}${val.slice(1)}`;
    }

    numericLiteral(number: NumericLiteral): EmitterOutput<string> {
        return code`${number.value.toString()}`;
    }

    stringLiteral(string: StringLiteral): EmitterOutput<string> {
        return code`"${string.value}"`;
    }

    intrinsic(intrinsic: IntrinsicType, name: string): EmitterOutput<string> {
        switch (name) {
            case "never":
                reportDiagnostic(this.emitter.getProgram(), {
                    code: "intrinsic-type-unsupported",
                    target: intrinsic,
                    messageId: "never",
                });
                return this.emitter.result.none();
            case "unknown":
                return code`object`;
            case "null":
            case "void":
                return code`None`;
            default:
                reportDiagnostic(this.emitter.getProgram(), {
                    code: "intrinsic-type-unsupported",
                    target: intrinsic,
                    format: { name: name },
                });
                return code`object`;
        }
    }

    scalarDeclaration(scalar: Scalar, name: string): EmitterOutput<string> {
        switch (scalar.name) {
            case "boolean":
                return "bool";
            case "string":
            case "guid":
            case "url":
            case "uuid":
            case "password":
            case "armId":
            case "ipAddress":
            case "azureLocation":
            case "eTag":
                return "str";
            case "int16":
            case "int32":
            case "int64":
                return "int"
            case "float16":
            case "float32":
            case "float64":
                return "float";
            case "decimal":
            case "decimal128":
                return "Decimal"
            case "utcDateTime":
                return "datetime";
            default:
                return code`${this.#checkName(scalar.name)}`;
        }
    }

    scalarInstantiation(scalar: Scalar, name: string | undefined): EmitterOutput<string> {
        const base = this.#getBaseScalar(scalar);
        if (base !== undefined) {
            return this.emitter.emitTypeReference(base);
        } else {
            return this.emitter.result.none();
        }
    }

    operationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
        // Operations not supported
        return this.emitter.result.none();
    }

    operationReturnType(operation: Operation, returnType: Type): EmitterOutput<string> {
        // Operations not supported
        return this.emitter.result.none();
    }

    interfaceDeclaration(iface: Interface, name: string): EmitterOutput<string> {
        // Operation interfaces not supported
        return this.emitter.result.none();
    }

    interfaceOperationDeclaration(operation: Operation, name: string): EmitterOutput<string> {
        // Operation interfaces not supported
        return this.emitter.result.none();
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
        return this.emitter.result.declaration(name, '');
    }

    unionInstantiation(union: Union, name: string): EmitterOutput<string> {
        return this.emitter.emitUnionVariants(union);
    }

    unionLiteral(union: Union): EmitterOutput<string> {
        return this.emitter.emitUnionVariants(union);
    }

    /**
     * Returns a string representation of the union type. If all variants are literals
     * it will return only `Literal[...]`. If all variants are non-literals it will
     * return only `Union[...]`. If there are both literal and non-literal variants
     * the literals will be listed first (`Union[Literal[...], ...]`).
     */
    unionVariants(union: Union): EmitterOutput<string> {
        const builder = new StringBuilder();
        const literals: UnionVariantMetadata[] = [];
        const nonLiterals: UnionVariantMetadata[] = [];
        for (const variant of union.variants.values()) {
            const isLiteral = this.#isLiteral(variant.type);
            if (isLiteral) {
                literals.push({
                    type: variant.type,
                    value: code`${this.emitter.emitTypeReference(variant.type)}`,
                });
            } else  {
                // value is already represented in nonLiterals array, don't add it again
                const value = code`${this.emitter.emitTypeReference(variant.type)}`
                if (nonLiterals.some((val) => val.value === value)) continue;
                nonLiterals.push({
                    type: variant.type,
                    value: value,
                });
            }
        }
        const hasLiterals = literals.length > 0;
        const hasNonLiterals = nonLiterals.length > 0;
        if (!hasLiterals && !hasNonLiterals) {
            reportDiagnostic(this.emitter.getProgram(), {
                code: "empty-union",
                target: union
            });
        }
        if (hasNonLiterals) {
            builder.push(code`Union[`);
        }
        if (hasLiterals) {
            builder.push(code`Literal[`);
            let i = 0;
            const length = literals.length;
            for (const val of literals) {
                builder.push(val.value);
                if (++i < length) builder.push(code`, `);
            }
            builder.push(code`]`);
        }
        if (hasNonLiterals) {
            let i = 0;
            const length = nonLiterals.length;
            if (hasLiterals) {
                builder.push(code`, `);
            }
            for (const val of nonLiterals) {
                builder.push(val.value);
                if (++i < length) builder.push(code`, `);
            }
            builder.push(code`]`);
        }
        return builder.reduce();        
    }
}
