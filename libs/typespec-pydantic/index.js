import { createTypeSpecLibrary, paramMessage, getDoc, getVisibility, getMinLength, getMaxLength, getPattern, getMinValue, getMinValueExclusive, getMaxValue, getMaxValueExclusive, getDiscriminator } from '@typespec/compiler';
import { CodeTypeEmitter, code, StringBuilder } from '@typespec/compiler/emitter-framework';

const PydanticEmitterOptionsSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        "output-file": { type: "string", nullable: true },
    },
    required: [],
};
const $lib = createTypeSpecLibrary({
    name: "typespec-pydantic",
    diagnostics: {
        "anonymous-model": {
            severity: "warning",
            messages: {
                default: "Anonymous models are not supported. Consider extracting your anonymous model into a named model.",
            },
        },
        "empty-union": {
            severity: "error",
            messages: {
                default: "Unions must have at least one variant.",
            },
        },
        "intrinsic-type-unsupported": {
            severity: "warning",
            messages: {
                default: paramMessage `Intrinsic type '${"name"}' not recognized. Assuming 'object'. Please file an issue.`,
                never: "Intrinsic type 'never' not supported in Pydantic. Property will be omitted.",
            },
        },
        "invalid-discriminated-union": {
            severity: "warning",
            messages: {
                default: "Found conflicting discriminators in union. Ensure all variants have the same discriminator.",
            },
        },
    },
    emitter: {
        options: PydanticEmitterOptionsSchema,
    },
});
// Optional but convenient, those are meant to be used locally in your library.
const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;

const namespace = "Pydantic";
const fieldKey = createStateSymbol("field");
/**
 * Set a specific operation ID.
 * @param context Decorator Context
 * @param entity Decorator target
 * @param key Pydantic Field key
 * @param value Pydantic Field value
 */
function $field(context, entity, key, value) {
    var _a;
    const values = (_a = context.program.stateMap(fieldKey).get(entity)) !== null && _a !== void 0 ? _a : [];
    values.push({ key, value });
    context.program.stateMap(fieldKey).set(entity, values);
}
/**
 * @returns Dictionary of key-value pairs set via the @field decorator
 */
function getFields(program, entity) {
    return program.stateMap(fieldKey).get(entity);
}

var __classPrivateFieldGet = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _PydanticEmitter_instances, _a, _PydanticEmitter_indent, _PydanticEmitter_getBaseScalar, _PydanticEmitter_isLiteral, _PydanticEmitter_toSnakeCase, _PydanticEmitter_checkName, _PydanticEmitter_isDeclared, _PydanticEmitter_declare, _PydanticEmitter_findDiscriminator, _PydanticEmitter_emitFieldValue, _PydanticEmitter_emitField;
async function $onEmit(context) {
    const assetEmitter = context.getAssetEmitter(PydanticEmitter);
    assetEmitter.emitProgram();
    await assetEmitter.writeOutput();
}
class PydanticEmitter extends CodeTypeEmitter {
    constructor() {
        super(...arguments);
        _PydanticEmitter_instances.add(this);
        this.declaredType = new Set();
        this.deferredModels = new Map();
    }
    programContext(program) {
        var _b;
        const options = this.emitter.getOptions();
        const outFile = (_b = options["output-file"]) !== null && _b !== void 0 ? _b : "models.py";
        const sourceFile = this.emitter.createSourceFile(outFile);
        return {
            scope: sourceFile.globalScope,
        };
    }
    sourceFile(sourceFile) {
        const emittedSourceFile = {
            path: sourceFile.path,
            contents: _a.pydanticHeader + "\n\n",
        };
        for (const decl of sourceFile.globalScope.declarations) {
            emittedSourceFile.contents += decl.value + "\n\n";
        }
        for (const [name, model] of this.deferredModels) {
            const props = this.emitter.emitModelProperties(model);
            const modelCode = code `class ${name}(BaseModel):\n${props}`;
            emittedSourceFile.contents += modelCode + "\n\n";
        }
        return emittedSourceFile;
    }
    modelDeclaration(model, name) {
        const props = this.emitter.emitModelProperties(model);
        const docs = getDoc(this.emitter.getProgram(), model);
        const builder = new StringBuilder();
        builder.push(code `class ${name}(BaseModel):\n`);
        if (docs !== undefined) {
            builder.push(code `${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this)}"""${docs}"""\n`);
        }
        if ([...model.properties.values()].length > 0) {
            builder.push(code `${props}`);
        }
        else {
            builder.push(code `${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this)}pass`);
        }
        return __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_declare).call(this, name, builder.reduce());
    }
    modelLiteral(model) {
        const program = this.emitter.getProgram();
        reportDiagnostic(program, {
            code: "anonymous-model",
            target: model,
        });
        return code `object`;
    }
    modelInstantiation(model, name) {
        var _b;
        if (model.name === "Record") {
            const type = (_b = model.templateMapper) === null || _b === void 0 ? void 0 : _b.args[0];
            return code `Dict[str, ${type ? this.emitter.emitTypeReference(type) : "None"}]`;
        }
        else {
            const modelName = __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_checkName).call(this, name !== null && name !== void 0 ? name : model.name);
            if (__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_isDeclared).call(this, modelName)) {
                return code `${modelName}`;
            }
            else {
                this.deferredModels.set(modelName, model);
                return code `"${modelName}"`;
            }
        }
    }
    modelProperties(model) {
        const builder = new StringBuilder();
        for (const prop of model.properties.values()) {
            builder.push(code `${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this)}${this.emitter.emitModelProperty(prop)}\n`);
        }
        return this.emitter.result.rawCode(builder.reduce());
    }
    modelPropertyLiteral(property) {
        const builder = new StringBuilder();
        const isOptional = property.optional;
        let type = undefined;
        type = this.emitter.emitTypeReference(property.type);
        // don't emit anything if type is `never`
        if (property.type.kind === "Intrinsic" && property.type.name === "never")
            return code ``;
        const isLiteral = __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_isLiteral).call(this, property.type);
        builder.push(code `${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_toSnakeCase).call(this, __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_checkName).call(this, property.name))}: `);
        if (isOptional) {
            builder.push(code `Optional[`);
        }
        if (isLiteral) {
            builder.push(code `Literal[`);
        }
        if (property.type.kind === "Union") {
            builder.push(code `${this.emitter.emitUnionVariants(property.type)}`);
        }
        else if (property.type.kind === "UnionVariant") {
            builder.push(code `${this.emitter.emitTypeReference(property.type.type)}`);
        }
        else {
            builder.push(code `${type}`);
        }
        if (isLiteral) {
            builder.push(code `]`);
        }
        if (isOptional) {
            builder.push(code `]`);
        }
        __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_emitField).call(this, builder, property);
        const docs = getDoc(this.emitter.getProgram(), property);
        if (docs !== undefined) {
            builder.push(code `\n${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this)}"""${docs}"""`);
        }
        return builder.reduce();
    }
    modelPropertyReference(property) {
        return code `${this.emitter.emitTypeReference(property.type)}`;
    }
    enumDeclaration(en, name) {
        const members = this.emitter.emitEnumMembers(en);
        const builder = new StringBuilder();
        const docs = getDoc(this.emitter.getProgram(), en);
        builder.push(code `class ${name}(BaseModel, Enum):\n`);
        if (docs !== undefined) {
            builder.push(code `${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this)}"""${docs}"""\n`);
        }
        builder.push(code `${members}`);
        return __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_declare).call(this, name, builder.reduce());
    }
    enumMembers(en) {
        const builder = new StringBuilder();
        for (const member of en.members.values()) {
            builder.push(code `${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this)}${this.emitter.emitType(member)}\n`);
        }
        return this.emitter.result.rawCode(builder.reduce());
    }
    enumMember(member) {
        const builder = new StringBuilder();
        builder.push(code `${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_toSnakeCase).call(this, member.name).toUpperCase()}`);
        __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_emitField).call(this, builder, member);
        const docs = getDoc(this.emitter.getProgram(), member);
        if (docs !== undefined) {
            builder.push(code `\n${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this)}"""${docs}"""`);
        }
        return builder.reduce();
    }
    enumMemberReference(member) {
        return code `Literal[${member.enum.name}.${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_toSnakeCase).call(this, member.name).toUpperCase()}]`;
    }
    arrayDeclaration(array, name, elementType) {
        const builder = new StringBuilder();
        builder.push(code `class ${name}(RootModel):\n`);
        builder.push(code `${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this)}root: List[${this.emitter.emitTypeReference(elementType)}]\n\n`);
        builder.push(code `${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this)}def __iter__(self):\n${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this, 2)}return iter(self.root)\n\n`);
        builder.push(code `${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this)}def __getitem__(self, item):\n${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_indent).call(this, 2)}return self.root[item]\n\n`);
        return __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_declare).call(this, name, builder.reduce());
    }
    arrayLiteral(array, elementType) {
        return code `List[${this.emitter.emitTypeReference(elementType)}]`;
    }
    booleanLiteral(boolean) {
        const val = boolean.value ? "True" : "False";
        return code `${val}`;
    }
    numericLiteral(number) {
        return code `${number.value.toString()}`;
    }
    stringLiteral(string) {
        return code `"${string.value}"`;
    }
    intrinsic(intrinsic, name) {
        switch (name) {
            case "never":
                reportDiagnostic(this.emitter.getProgram(), {
                    code: "intrinsic-type-unsupported",
                    target: intrinsic,
                    messageId: "never",
                });
                return this.emitter.result.none();
            case "unknown":
                return code `object`;
            case "null":
            case "void":
                return code `None`;
            default:
                reportDiagnostic(this.emitter.getProgram(), {
                    code: "intrinsic-type-unsupported",
                    target: intrinsic,
                    format: { name: name },
                });
                return code `object`;
        }
    }
    scalarDeclaration(scalar, name) {
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
                return "int";
            case "float16":
            case "float32":
            case "float64":
                return "float";
            case "decimal":
            case "decimal128":
                return "Decimal";
            case "utcDateTime":
                return "datetime";
            default:
                return code `${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_checkName).call(this, scalar.name)}`;
        }
    }
    scalarInstantiation(scalar, name) {
        const base = __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_getBaseScalar).call(this, scalar);
        if (base !== undefined) {
            return this.emitter.emitTypeReference(base);
        }
        else {
            return this.emitter.result.none();
        }
    }
    operationDeclaration(operation, name) {
        // Operations not supported
        return this.emitter.result.none();
    }
    operationReturnType(operation, returnType) {
        // Operations not supported
        return this.emitter.result.none();
    }
    interfaceDeclaration(iface, name) {
        // Operation interfaces not supported
        return this.emitter.result.none();
    }
    interfaceOperationDeclaration(operation, name) {
        // Operation interfaces not supported
        return this.emitter.result.none();
    }
    tupleLiteral(tuple) {
        const builder = new StringBuilder();
        let i = 0;
        const length = tuple.values.length;
        builder.push(code `Tuple[`);
        for (const item of tuple.values) {
            builder.push(code `${this.emitter.emitTypeReference(item)}`);
            if (++i < length)
                builder.push(code `, `);
            else
                builder.push(code `]`);
        }
        return builder.reduce();
    }
    unionDeclaration(union, name) {
        return __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_declare).call(this, name, undefined);
    }
    unionInstantiation(union, name) {
        return this.emitter.emitUnionVariants(union);
    }
    unionLiteral(union) {
        return this.emitter.emitUnionVariants(union);
    }
    /**
     * Returns a string representation of the union type. If all variants are literals
     * it will return only `Literal[...]`. If all variants are non-literals it will
     * return only `Union[...]`. If there are both literal and non-literal variants
     * the literals will be listed first (`Union[Literal[...], ...]`).
     */
    unionVariants(union) {
        const builder = new StringBuilder();
        const literals = [];
        const nonLiterals = [];
        for (const variant of union.variants.values()) {
            const isLiteral = __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_isLiteral).call(this, variant.type);
            if (isLiteral) {
                literals.push({
                    type: variant.type,
                    value: code `${this.emitter.emitTypeReference(variant.type)}`,
                });
            }
            else {
                // value is already represented in nonLiterals array, don't add it again
                const value = code `${this.emitter.emitTypeReference(variant.type)}`;
                if (nonLiterals.some((val) => val.value === value))
                    continue;
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
                target: union,
            });
        }
        if (hasNonLiterals) {
            builder.push(code `Union[`);
        }
        if (hasLiterals) {
            builder.push(code `Literal[`);
            let i = 0;
            const length = literals.length;
            for (const val of literals) {
                builder.push(val.value);
                if (++i < length)
                    builder.push(code `, `);
            }
            builder.push(code `]`);
        }
        if (hasNonLiterals) {
            let i = 0;
            const length = nonLiterals.length;
            if (hasLiterals) {
                builder.push(code `, `);
            }
            for (const val of nonLiterals) {
                builder.push(val.value);
                if (++i < length)
                    builder.push(code `, `);
            }
            builder.push(code `]`);
        }
        return builder.reduce();
    }
}
_a = PydanticEmitter, _PydanticEmitter_instances = new WeakSet(), _PydanticEmitter_indent = function _PydanticEmitter_indent(count = 1) {
    let val = "";
    for (let i = 0; i < count; i++) {
        val += _a.pythonIndent;
    }
    return val;
}, _PydanticEmitter_getBaseScalar = function _PydanticEmitter_getBaseScalar(type) {
    if (type.baseScalar !== undefined) {
        return __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_getBaseScalar).call(this, type.baseScalar);
    }
    return type;
}, _PydanticEmitter_isLiteral = function _PydanticEmitter_isLiteral(type) {
    return ![
        "Scalar",
        "Enum",
        "Union",
        "Model",
        "Tuple",
        "UnionVariant",
        "EnumMember",
        "ModelProperty",
        "Intrinsic",
    ].includes(type.kind);
}, _PydanticEmitter_toSnakeCase = function _PydanticEmitter_toSnakeCase(name) {
    return name.replace(/([A-Z])/g, "_$1").toLowerCase();
}, _PydanticEmitter_checkName = function _PydanticEmitter_checkName(name) {
    if (_a.reservedKeywords.includes(name)) {
        return `${name}_`;
    }
    else if (name.match(/^\d/)) {
        return `_${name}`;
    }
    return name;
}, _PydanticEmitter_isDeclared = function _PydanticEmitter_isDeclared(name) {
    return this.declaredType.has(name);
}, _PydanticEmitter_declare = function _PydanticEmitter_declare(name, value) {
    this.declaredType.add(name);
    return this.emitter.result.declaration(name, value !== null && value !== void 0 ? value : "");
}, _PydanticEmitter_findDiscriminator = function _PydanticEmitter_findDiscriminator(type) {
    if (type.kind === "Union") {
        const variants = [...type.variants.values()];
        const discriminators = variants.map((variant) => __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_findDiscriminator).call(this, variant.type));
        // if all discriminators are undefined, return undefined. If all discriminator values are the same, return that value.
        if (discriminators.every((discriminator) => discriminator === undefined)) {
            return undefined;
        }
        if (discriminators.every((discriminator) => discriminator === discriminators[0])) {
            return discriminators[0];
        }
        else {
            reportDiagnostic(this.emitter.getProgram(), {
                code: "invalid-discriminated-union",
                target: type,
            });
            return undefined;
        }
    }
    else if (type.kind === "Model") {
        const discriminator = getDiscriminator(this.emitter.getProgram(), type);
        if (discriminator !== undefined) {
            return discriminator.propertyName;
        }
        else if (type.baseModel !== undefined) {
            return __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_findDiscriminator).call(this, type.baseModel);
        }
    }
    return undefined;
}, _PydanticEmitter_emitFieldValue = function _PydanticEmitter_emitFieldValue(value) {
    if (typeof value === "boolean") {
        return value ? "True" : "False";
    }
    else if (typeof value === "string") {
        // if string already is quoted, don't quote it again
        if (value.startsWith('"') && value.endsWith('"')) {
            return value;
        }
        else {
            return `"${value}"`;
        }
    }
    else if (typeof value === "number") {
        return value.toString();
    }
    else {
        return code `${this.emitter.emitTypeReference(value)}`;
    }
}, _PydanticEmitter_emitField = function _PydanticEmitter_emitField(builder, item) {
    const metadata = {};
    // gather metadata
    const doc = getDoc(this.emitter.getProgram(), item);
    metadata.description = doc !== undefined ? code `"${doc}"` : undefined;
    if (item.kind === "ModelProperty") {
        if (item.default !== undefined) {
            metadata.default = item.default;
        }
    }
    else if (item.kind === "EnumMember") {
        metadata.default = item.value !== undefined ? item.value : __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_checkName).call(this, item.name);
        metadata.frozen = true;
    }
    // check for read-only properties
    const visibility = getVisibility(this.emitter.getProgram(), item);
    if (visibility !== undefined && visibility.length === 1 && visibility[0] === "read") {
        metadata.frozen = true;
    }
    // gather string metadata
    metadata.minLength = getMinLength(this.emitter.getProgram(), item);
    metadata.maxLength = getMaxLength(this.emitter.getProgram(), item);
    metadata.pattern = getPattern(this.emitter.getProgram(), item);
    // gather numeric metadata
    metadata.ge = getMinValue(this.emitter.getProgram(), item);
    metadata.gt = getMinValueExclusive(this.emitter.getProgram(), item);
    metadata.le = getMaxValue(this.emitter.getProgram(), item);
    metadata.lt = getMaxValueExclusive(this.emitter.getProgram(), item);
    // gather discriminator metadata
    if (item.kind === "ModelProperty") {
        const discriminator = __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_findDiscriminator).call(this, item.type);
        metadata.discriminator = discriminator !== undefined ? discriminator : undefined;
    }
    else {
        metadata.discriminator = undefined;
    }
    // TODO: completely unsupported metadata
    metadata.defaultFactory = undefined;
    metadata.examples = undefined;
    metadata.jsonSchemaExtra = undefined;
    // TODO: Supported with @field decorator
    metadata.validateDefault = undefined;
    metadata.title = undefined;
    metadata.repr = undefined;
    metadata.alias = undefined;
    metadata.validationAlias = undefined;
    metadata.serializationAlias = undefined;
    metadata.multipleOf = undefined;
    metadata.allowInfNan = undefined;
    metadata.maxDigits = undefined;
    metadata.decimalPlaces = undefined;
    metadata.initVar = undefined;
    metadata.kwOnly = undefined;
    metadata.strict = undefined;
    metadata.exclude = undefined;
    if (item.kind === "ModelProperty") {
        const fields = getFields(this.emitter.getProgram(), item);
        for (const field of fields !== null && fields !== void 0 ? fields : []) {
            metadata[field.key] = field.value;
        }
    }
    // delete any undefined values
    for (const [key, val] of Object.entries(metadata)) {
        if (val === undefined) {
            delete metadata[key];
        }
    }
    // don't emit anything if there is no metadata
    if (Object.keys(metadata).length === 0)
        return builder;
    // emit metadata
    builder.push(code ` = Field(`);
    let i = 0;
    const length = Object.keys(metadata).length;
    for (const [key, val] of Object.entries(metadata)) {
        if (val === undefined)
            continue;
        const pythonKey = __classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_toSnakeCase).call(this, key);
        builder.push(code `${pythonKey}=${__classPrivateFieldGet(this, _PydanticEmitter_instances, "m", _PydanticEmitter_emitFieldValue).call(this, val)}`);
        if (++i < length)
            builder.push(code `, `);
    }
    builder.push(code `)`);
    return builder;
};
PydanticEmitter.pythonIndent = "    ";
// TODO: Imports should be handled dynamically
PydanticEmitter.pydanticHeader = `from pydantic import *\nfrom typing import *\nfrom datetime import *\nfrom decimal import *\nfrom enum import Enum`;
PydanticEmitter.reservedKeywords = [
    "and",
    "as",
    "assert",
    "break",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "False",
    "finally",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "None",
    "nonlocal",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "True",
    "try",
    "while",
    "with",
    "yield",
];

// Re-export $lib to the compiler can get access to it and register your library correctly.

var f0 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    $field: $field,
    $lib: $lib,
    $onEmit: $onEmit,
    getFields: getFields,
    namespace: namespace
});

const TypeSpecJSSources = {
"dist/src/index.js": f0,
};
const TypeSpecSources = {
  "package.json": "{\"name\":\"typespec-pydantic\",\"version\":\"1.0.0-beta.1\",\"author\":\"Microsoft Corporation\",\"description\":\"Pydantic emitter for TypeSpec\",\"homepage\":\"https://github.com/tjprescott/typespec-pydantic\",\"readme\":\"https://github.com/tjprescott/typespec-pydantic/blob/master/README.md\",\"license\":\"MIT\",\"repository\":{\"type\":\"git\",\"url\":\"git+https://github.com/tjprescott/typespec-pydantic.git\"},\"bugs\":{\"url\":\"https://github.com/tjprescott/typespec-pydantic/issues\"},\"keywords\":[\"typespec\",\"python\"],\"type\":\"module\",\"main\":\"dist/src/index.js\",\"exports\":{\".\":{\"default\":\"./dist/src/index.js\",\"types\":\"./dist/src/index.d.ts\"},\"./testing\":{\"default\":\"./dist/src/testing/index.js\",\"types\":\"./dist/src/testing/index.d.ts\"}},\"tspMain\":\"lib/main.tsp\",\"scripts\":{\"clean\":\"rimraf ./dist ./temp\",\"build\":\"tsc -p .\",\"watch\":\"tsc -p . --watch\",\"lint\":\"eslint . --ext .ts --max-warnings=0\",\"format\":\"npm run -s prettier -- --write\",\"check-format\":\"npm run -s prettier -- --check\",\"cspell\":\"cspell \\\"**/*.md\\\" \\\"**/*.ts\\\" \\\"**/*.tsp\\\"\",\"test\":\"mocha\"},\"peerDependencies\":{\"@typespec/compiler\":\"^0.50.0\"},\"devDependencies\":{\"@changesets/cli\":\"^2.27.1\",\"@types/node\":\"~18.11.9\",\"@typespec/prettier-plugin-typespec\":\"~0.50.0\",\"@typespec/eslint-config-typespec\":\"~0.50.0\",\"@types/mocha\":\"~10.0.1\",\"source-map-support\":\"^0.5.21\",\"cspell\":\"^7.3.9\",\"eslint\":\"^8.55.0\",\"eslint-plugin-import\":\"^2.29.0\",\"mocha\":\"~10.2.0\",\"prettier\":\"^3.1.1\",\"rimraf\":\"^5.0.5\",\"syncpack\":\"^11.2.1\",\"ts-node\":\"10.9.2\",\"ts-mocha\":\"^10.0.0\",\"typescript\":\"^5.3.3\"},\"syncpack\":{\"dependencyTypes\":[\"dev\",\"overrides\",\"peer\",\"pnpmOverrides\",\"prod\",\"resolutions\"]}}",
  "../../node_modules/.pnpm/@typespec+compiler@0.51.0/node_modules/@typespec/compiler/lib/main.tsp": "import \"./lib.tsp\";\nimport \"./decorators.tsp\";\nimport \"./reflection.tsp\";\nimport \"./projected-names.tsp\";\n",
  "../../node_modules/.pnpm/@typespec+compiler@0.51.0/node_modules/@typespec/compiler/lib/lib.tsp": "namespace TypeSpec;\n\n/**\n * Represent a byte array\n */\nscalar bytes;\n\n/**\n * A numeric type\n */\nscalar numeric;\n\n/**\n * A whole number. This represent any `integer` value possible.\n * It is commonly represented as `BigInteger` in some languages.\n */\nscalar integer extends numeric;\n\n/**\n * A number with decimal value\n */\nscalar float extends numeric;\n\n/**\n * A 64-bit integer. (`-9,223,372,036,854,775,808` to `9,223,372,036,854,775,807`)\n */\nscalar int64 extends integer;\n\n/**\n * A 32-bit integer. (`-2,147,483,648` to `2,147,483,647`)\n */\nscalar int32 extends int64;\n\n/**\n * A 16-bit integer. (`-32,768` to `32,767`)\n */\nscalar int16 extends int32;\n\n/**\n * A 8-bit integer. (`-128` to `127`)\n */\nscalar int8 extends int16;\n\n/**\n * A 64-bit unsigned integer (`0` to `18,446,744,073,709,551,615`)\n */\nscalar uint64 extends integer;\n\n/**\n * A 32-bit unsigned integer (`0` to `4,294,967,295`)\n */\nscalar uint32 extends uint64;\n\n/**\n * A 16-bit unsigned integer (`0` to `65,535`)\n */\nscalar uint16 extends uint32;\n\n/**\n * A 8-bit unsigned integer (`0` to `255`)\n */\nscalar uint8 extends uint16;\n\n/**\n * An integer that can be serialized to JSON (`−9007199254740991 (−(2^53 − 1))` to `9007199254740991 (2^53 − 1)` )\n */\nscalar safeint extends int64;\n\n/**\n * A 32 bit floating point number. (`±1.5 x 10^−45` to `±3.4 x 10^38`)\n */\nscalar float64 extends float;\n\n/**\n * A 32 bit floating point number. (`±5.0 × 10^−324` to `±1.7 × 10^308`)\n */\nscalar float32 extends float64;\n\n/**\n * A decimal number with any length and precision. This represent any `decimal` value possible.\n * It is commonly represented as `BigDecimal` in some languages.\n */\nscalar decimal extends numeric;\n\n/**\n * A 128-bit decimal number.\n */\nscalar decimal128 extends decimal;\n\n/**\n * A sequence of textual characters.\n */\nscalar string;\n\n/**\n * A date on a calendar without a time zone, e.g. \"April 10th\"\n */\nscalar plainDate;\n\n/**\n * A time on a clock without a time zone, e.g. \"3:00 am\"\n */\nscalar plainTime;\n\n/**\n * An instant in coordinated universal time (UTC)\"\n */\nscalar utcDateTime;\n\n/**\n * A date and time in a particular time zone, e.g. \"April 10th at 3:00am in PST\"\n */\nscalar offsetDateTime;\n\n/**\n * A duration/time period. e.g 5s, 10h\n */\nscalar duration;\n\n/**\n * Boolean with `true` and `false` values.\n */\nscalar boolean;\n\n/**\n * Represent a 32-bit unix timestamp datetime with 1s of granularity.\n * It measures time by the number of seconds that have elapsed since 00:00:00 UTC on 1 January 1970.\n *\n */\n@encode(\"unixTimestamp\", int32)\nscalar unixTimestamp32 extends utcDateTime;\n\n/**\n * Represent a model\n */\n// Deprecated June 2023 sprint\n#deprecated \"object is deprecated. Please use {} for an empty model, `Record<unknown>` for a record with unknown property types, `unknown[]` for an array.\"\nmodel object {}\n\n/**\n * @dev Array model type, equivalent to `T[]`\n * @template T The type of the array elements\n */\n@indexer(integer, T)\nmodel Array<T> {}\n\n/**\n * @dev Model with string properties where all the properties have type `T`\n * @template T The type of the properties\n */\n@indexer(string, T)\nmodel Record<T> {}\n\n/**\n * Represent a URL string as described by https://url.spec.whatwg.org/\n */\nscalar url extends string;\n\n/**\n * Represents a collection of optional properties.\n * @template T An object whose spread properties are all optional.\n */\n@doc(\"The template for adding optional properties.\")\n@withOptionalProperties\nmodel OptionalProperties<T> {\n  ...T;\n}\n\n/**\n * Represents a collection of updateable properties.\n * @template T An object whose spread properties are all updateable.\n */\n@doc(\"The template for adding updateable properties.\")\n@withUpdateableProperties\nmodel UpdateableProperties<T> {\n  ...T;\n}\n\n/**\n * Represents a collection of omitted properties.\n * @template T An object whose properties are spread.\n * @template TKeys The property keys to omit.\n */\n@doc(\"The template for omitting properties.\")\n@withoutOmittedProperties(TKeys)\nmodel OmitProperties<T, TKeys extends string> {\n  ...T;\n}\n\n/**\n * Represents a collection of properties with default values omitted.\n * @template T An object whose spread property defaults are all omitted.\n */\n@withoutDefaultValues\nmodel OmitDefaults<T> {\n  ...T;\n}\n\n/**\n * Applies a visibility setting to a collection of properties.\n * @template T An object whose properties are spread.\n * @template Visibility The visibility to apply to all properties.\n */\n@doc(\"The template for setting the default visibility of key properties.\")\n@withDefaultKeyVisibility(Visibility)\nmodel DefaultKeyVisibility<T, Visibility extends valueof string> {\n  ...T;\n}\n",
  "../../node_modules/.pnpm/@typespec+compiler@0.51.0/node_modules/@typespec/compiler/lib/decorators.tsp": "import \"../dist/src/lib/decorators.js\";\n\nusing TypeSpec.Reflection;\n\nnamespace TypeSpec;\n\n/**\n * Typically a short, single-line description.\n * @param summary Summary string.\n *\n * @example\n * ```typespec\n * @summary(\"This is a pet\")\n * model Pet {}\n * ```\n */\nextern dec summary(target: unknown, summary: valueof string);\n\n/**\n * Attach a documentation string.\n * @param doc Documentation string\n * @param formatArgs Record with key value pair that can be interpolated in the doc.\n *\n * @example\n * ```typespec\n * @doc(\"Represent a Pet available in the PetStore\")\n * model Pet {}\n * ```\n */\nextern dec doc(target: unknown, doc: valueof string, formatArgs?: {});\n\n/**\n * Attach a documentation string to describe the successful return types of an operation.\n * If an operation returns a union of success and errors it only describe the success. See `@errorsDoc` for error documentation.\n * @param doc Documentation string\n *\n * @example\n * ```typespec\n * @returnsDoc(\"Returns doc\")\n * op get(): Pet | NotFound;\n * ```\n */\nextern dec returnsDoc(target: Operation, doc: valueof string);\n\n/**\n * Attach a documentation string to describe the error return types of an operation.\n * If an operation returns a union of success and errors it only describe the errors. See `@errorsDoc` for success documentation.\n * @param doc Documentation string\n *\n * @example\n * ```typespec\n * @errorsDoc(\"Returns doc\")\n * op get(): Pet | NotFound;\n * ```\n */\nextern dec errorsDoc(target: Operation, doc: valueof string);\n\n/**\n * Mark this type as deprecated.\n *\n * NOTE: This decorator **should not** be used, use the `#deprecated` directive instead.\n *\n * @deprecated Use the `#deprecated` directive instead.\n * @param message Deprecation message.\n *\n * @example\n *\n * Use the `#deprecated` directive instead:\n *\n * ```typespec\n * #deprecated \"Use ActionV2\"\n * op Action<T>(): T;\n * ```\n */\n#deprecated \"@deprecated decorator is deprecated. Use the `#deprecated` directive instead.\"\nextern dec deprecated(target: unknown, message: valueof string);\n\n/**\n * Service options.\n */\nmodel ServiceOptions {\n  /**\n   * Title of the service.\n   */\n  title?: string;\n\n  /**\n   * Version of the service.\n   */\n  version?: string;\n}\n\n/**\n * Mark this namespace as describing a service and configure service properties.\n * @param options Optional configuration for the service.\n *\n * @example\n * ```typespec\n * @service\n * namespace PetStore;\n * ```\n *\n * @example Setting service title\n * ```typespec\n * @service({title: \"Pet store\"})\n * namespace PetStore;\n * ```\n *\n * @example Setting service version\n * ```typespec\n * @service({version: \"1.0\"})\n * namespace PetStore;\n * ```\n */\nextern dec service(target: Namespace, options?: ServiceOptions);\n\n/**\n * Specify that this model is an error type. Operations return error types when the operation has failed.\n *\n * @example\n * ```typespec\n * @error\n * model PetStoreError {\n *   code: string;\n *   message: string;\n * }\n * ```\n */\nextern dec error(target: Model);\n\n/**\n * Specify a known data format hint for this string type. For example `uuid`, `uri`, etc.\n * This differs from the `@pattern` decorator which is meant to specify a regular expression while `@format` accepts a known format name.\n * The format names are open ended and are left to emitter to interpret.\n *\n * @param format format name.\n *\n * @example\n * ```typespec\n * @format(\"uuid\")\n * scalar uuid extends string;\n * ```\n */\nextern dec format(target: string | bytes | ModelProperty, format: valueof string);\n\n/**\n * Specify the the pattern this string should respect using simple regular expression syntax.\n * The following syntax is allowed: alternations (`|`), quantifiers (`?`, `*`, `+`, and `{ }`), wildcard (`.`), and grouping parentheses.\n * Advanced features like look-around, capture groups, and references are not supported.\n *\n * @param pattern Regular expression.\n *\n * @example\n * ```typespec\n * @pattern(\"[a-z]+\")\n * scalar LowerAlpha extends string;\n * ```\n */\nextern dec pattern(target: string | bytes | ModelProperty, pattern: valueof string);\n\n/**\n * Specify the minimum length this string type should be.\n * @param value Minimum length\n *\n * @example\n * ```typespec\n * @minLength(2)\n * scalar Username extends string;\n * ```\n */\nextern dec minLength(target: string | ModelProperty, value: valueof integer);\n\n/**\n * Specify the maximum length this string type should be.\n * @param value Maximum length\n *\n * @example\n * ```typespec\n * @maxLength(20)\n * scalar Username extends string;\n * ```\n */\nextern dec maxLength(target: string | ModelProperty, value: valueof integer);\n\n/**\n * Specify the minimum number of items this array should have.\n * @param value Minimum number\n *\n * @example\n * ```typespec\n * @minItems(1)\n * model Endpoints is string[];\n * ```\n */\nextern dec minItems(target: unknown[] | ModelProperty, value: valueof integer);\n\n/**\n * Specify the maximum number of items this array should have.\n * @param value Maximum number\n *\n * @example\n * ```typespec\n * @maxItems(5)\n * model Endpoints is string[];\n * ```\n */\nextern dec maxItems(target: unknown[] | ModelProperty, value: valueof integer);\n\n/**\n * Specify the minimum value this numeric type should be.\n * @param value Minimum value\n *\n * @example\n * ```typespec\n * @minValue(18)\n * scalar Age is int32;\n * ```\n */\nextern dec minValue(target: numeric | ModelProperty, value: valueof numeric);\n\n/**\n * Specify the maximum value this numeric type should be.\n * @param value Maximum value\n *\n * @example\n * ```typespec\n * @maxValue(200)\n * scalar Age is int32;\n * ```\n */\nextern dec maxValue(target: numeric | ModelProperty, value: valueof numeric);\n\n/**\n * Specify the minimum value this numeric type should be, exclusive of the given\n * value.\n * @param value Minimum value\n *\n * @example\n * ```typespec\n * @minValueExclusive(0)\n * scalar distance is float64;\n * ```\n */\nextern dec minValueExclusive(target: numeric | ModelProperty, value: valueof numeric);\n\n/**\n * Specify the maximum value this numeric type should be, exclusive of the given\n * value.\n * @param value Maximum value\n *\n * @example\n * ```typespec\n * @maxValueExclusive(50)\n * scalar distance is float64;\n * ```\n */\nextern dec maxValueExclusive(target: numeric | ModelProperty, value: valueof numeric);\n\n/**\n * Mark this string as a secret value that should be treated carefully to avoid exposure\n *\n * @example\n * ```typespec\n * @secret\n * scalar Password is string;\n * ```\n */\nextern dec secret(target: string | ModelProperty);\n\n/**\n * Mark this operation as a `list` operation for resource types.\n * @deprecated Use the `listsResource` decorator in `@typespec/rest` instead.\n * @param listedType Optional type of the items in the list.\n */\nextern dec list(target: Operation, listedType?: Model);\n\n/**\n * Attaches a tag to an operation, interface, or namespace. Multiple `@tag` decorators can be specified to attach multiple tags to a TypeSpec element.\n * @param tag Tag value\n */\nextern dec tag(target: Namespace | Interface | Operation, tag: valueof string);\n\n/**\n * Specifies how a templated type should name their instances.\n * @param name name the template instance should take\n * @param formatArgs Model with key value used to interpolate the name\n *\n * @example\n * ```typespec\n * @friendlyName(\"{name}List\", T)\n * model List<T> {\n *   value: T[];\n *   nextLink: string;\n * }\n * ```\n */\nextern dec friendlyName(target: unknown, name: valueof string, formatArgs?: unknown);\n\n/**\n * Provide a set of known values to a string type.\n * @param values Known values enum.\n *\n * @example\n * ```typespec\n * @knownValues(KnownErrorCode)\n * scalar ErrorCode extends string;\n *\n * enum KnownErrorCode {\n *   NotFound,\n *   Invalid,\n * }\n * ```\n */\nextern dec knownValues(target: string | numeric | ModelProperty, values: Enum);\n\n/**\n * Mark a model property as the key to identify instances of that type\n * @param altName Name of the property. If not specified, the decorated property name is used.\n *\n * @example\n * ```typespec\n * model Pet {\n *   @key id: string;\n * }\n * ```\n */\nextern dec key(target: ModelProperty, altName?: valueof string);\n\n/**\n * Specify this operation is an overload of the given operation.\n * @param overloadbase Base operation that should be a union of all overloads\n *\n * @example\n * ```typespec\n * op upload(data: string | bytes, @header contentType: \"text/plain\" | \"application/octet-stream\"): void;\n * @overload(upload)\n * op uploadString(data: string, @header contentType: \"text/plain\" ): void;\n * @overload(upload)\n * op uploadBytes(data: bytes, @header contentType: \"application/octet-stream\"): void;\n * ```\n */\nextern dec overload(target: Operation, overloadbase: Operation);\n\n/**\n * Provide an alternative name for this type.\n * @param targetName Projection target\n * @param projectedName Alternative name\n *\n * @example\n * ```typespec\n * model Certificate {\n *   @projectedName(\"json\", \"exp\")\n *   expireAt: int32;\n * }\n * ```\n */\nextern dec projectedName(\n  target: unknown,\n  targetName: valueof string,\n  projectedName: valueof string\n);\n\n/**\n * Specify the property to be used to discriminate this type.\n * @param propertyName The property name to use for discrimination\n *\n * @example\n *\n * ```typespec\n * @discriminator(\"kind\")\n * union Pet{ cat: Cat, dog: Dog }\n *\n * model Cat {kind: \"cat\", meow: boolean}\n * model Dog {kind: \"dog\", bark: boolean}\n * ```\n *\n * ```typespec\n * @discriminator(\"kind\")\n * model Pet{ kind: string }\n *\n * model Cat extends Pet {kind: \"cat\", meow: boolean}\n * model Dog extends Pet  {kind: \"dog\", bark: boolean}\n * ```\n */\nextern dec discriminator(target: Model | Union, propertyName: valueof string);\n\n/**\n * Known encoding to use on utcDateTime or offsetDateTime\n */\nenum DateTimeKnownEncoding {\n  /**\n   * RFC 3339 standard. https://www.ietf.org/rfc/rfc3339.txt\n   * Encode to string.\n   */\n  rfc3339: \"rfc3339\",\n\n  /**\n   * RFC 7231 standard. https://www.ietf.org/rfc/rfc7231.txt\n   * Encode to string.\n   */\n  rfc7231: \"rfc7231\",\n\n  /**\n   * Encode to integer\n   */\n  unixTimestamp: \"unixTimestamp\",\n}\n\n/**\n * Known encoding to use on duration\n */\nenum DurationKnownEncoding {\n  /**\n   * ISO8601 duration\n   */\n  ISO8601: \"ISO8601\",\n\n  /**\n   * Encode to integer or float\n   */\n  seconds: \"seconds\",\n}\n\n/**\n * Known encoding to use on bytes\n */\nenum BytesKnownEncoding {\n  /**\n   * Encode to Base64\n   */\n  base64: \"base64\",\n\n  /**\n   * Encode to Base64 Url\n   */\n  base64url: \"base64url\",\n}\n\n/**\n * Specify how to encode the target type.\n * @param encoding Known name of an encoding.\n * @param encodedAs What target type is this being encoded as. Default to string.\n *\n * @example offsetDateTime encoded with rfc7231\n *\n * ```tsp\n * @encode(\"rfc7231\")\n * scalar myDateTime extends offsetDateTime;\n * ```\n *\n * @example utcDateTime encoded with unixTimestamp\n *\n * ```tsp\n * @encode(\"unixTimestamp\", int32)\n * scalar myDateTime extends unixTimestamp;\n * ```\n */\nextern dec encode(\n  target: Scalar | ModelProperty,\n  encoding: string | EnumMember,\n  encodedAs?: Scalar\n);\n\n/**\n * Indicates that a property is only considered to be present or applicable (\"visible\") with\n * the in the given named contexts (\"visibilities\"). When a property has no visibilities applied\n * to it, it is implicitly visible always.\n *\n * As far as the TypeSpec core library is concerned, visibilities are open-ended and can be arbitrary\n * strings, but  the following visibilities are well-known to standard libraries and should be used\n * with standard emitters that interpret them as follows:\n *\n * - \"read\": output of any operation.\n * - \"create\": input to operations that create an entity..\n * - \"query\": input to operations that read data.\n * - \"update\": input to operations that update data.\n * - \"delete\": input to operations that delete data.\n *\n * See also: [Automatic visibility](https://microsoft.github.io/typespec/libraries/http/operations#automatic-visibility)\n *\n * @param visibilities List of visibilities which apply to this property.\n *\n * @example\n *\n * ```typespec\n * model Dog {\n *   // the service will generate an ID, so you don't need to send it.\n *   @visibility(\"read\") id: int32;\n *   // the service will store this secret name, but won't ever return it\n *   @visibility(\"create\", \"update\") secretName: string;\n *   // the regular name is always present\n *   name: string;\n * }\n * ```\n */\nextern dec visibility(target: ModelProperty, ...visibilities: valueof string[]);\n\n/**\n * Removes properties that are not considered to be present or applicable\n * (\"visible\") in the given named contexts (\"visibilities\"). Can be used\n * together with spread to effectively spread only visible properties into\n * a new model.\n *\n * See also: [Automatic visibility](https://microsoft.github.io/typespec/libraries/http/operations#automatic-visibility)\n *\n * When using an emitter that applies visibility automatically, it is generally\n * not necessary to use this decorator.\n *\n * @param visibilities List of visibilities which apply to this property.\n *\n * @example\n * ```typespec\n * model Dog {\n *   @visibility(\"read\") id: int32;\n *   @visibility(\"create\", \"update\") secretName: string;\n *   name: string;\n * }\n *\n * // The spread operator will copy all the properties of Dog into DogRead,\n * // and @withVisibility will then remove those that are not visible with\n * // create or update visibility.\n * //\n * // In this case, the id property is removed, and the name and secretName\n * // properties are kept.\n * @withVisibility(\"create\", \"update\")\n * model DogCreateOrUpdate {\n *   ...Dog;\n * }\n *\n * // In this case the id and name properties are kept and the secretName property\n * // is removed.\n * @withVisibility(\"read\")\n * model DogRead {\n *   ...Dog;\n * }\n * ```\n */\nextern dec withVisibility(target: Model, ...visibilities: valueof string[]);\n\n/**\n * Set the visibility of key properties in a model if not already set.\n *\n * @param visibility The desired default visibility value. If a key property already has a `visibility` decorator then the default visibility is not applied.\n */\nextern dec withDefaultKeyVisibility(target: Model, visibility: valueof string);\n\n/**\n * Returns the model with non-updateable properties removed.\n */\nextern dec withUpdateableProperties(target: Model);\n\n/**\n * Returns the model with required properties removed.\n */\nextern dec withOptionalProperties(target: Model);\n\n/**\n * Returns the model with any default values removed.\n */\nextern dec withoutDefaultValues(target: Model);\n\n/**\n * Returns the model with the given properties omitted.\n * @param omit List of properties to omit\n */\nextern dec withoutOmittedProperties(target: Model, omit: string | Union);\n\n//---------------------------------------------------------------------------\n// Debugging\n//---------------------------------------------------------------------------\n\n/**\n * A debugging decorator used to inspect a type.\n * @param text Custom text to log\n */\nextern dec inspectType(target: unknown, text: valueof string);\n\n/**\n * A debugging decorator used to inspect a type name.\n * @param text Custom text to log\n */\nextern dec inspectTypeName(target: unknown, text: valueof string);\n\n/**\n * Sets which visibilities apply to parameters for the given operation.\n * @param visibilities List of visibility strings which apply to this operation.\n */\nextern dec parameterVisibility(target: Operation, ...visibilities: valueof string[]);\n\n/**\n * Sets which visibilities apply to the return type for the given operation.\n * @param visibilities List of visibility strings which apply to this operation.\n */\nextern dec returnTypeVisibility(target: Operation, ...visibilities: valueof string[]);\n",
  "../../node_modules/.pnpm/@typespec+compiler@0.51.0/node_modules/@typespec/compiler/lib/reflection.tsp": "namespace TypeSpec.Reflection;\n\nmodel Enum {}\nmodel EnumMember {}\nmodel Interface {}\nmodel Model {}\nmodel ModelProperty {}\nmodel Namespace {}\nmodel Operation {}\nmodel Scalar {}\nmodel Union {}\nmodel UnionVariant {}\nmodel StringTemplate {}\n",
  "../../node_modules/.pnpm/@typespec+compiler@0.51.0/node_modules/@typespec/compiler/lib/projected-names.tsp": "// Set of projections consuming the @projectedName decorator\n#suppress \"projections-are-experimental\"\nprojection op#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection interface#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection model#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection enum#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection union#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n",
  "lib/main.tsp": "import \"../dist/src/index.js\";\n\nusing TypeSpec.Reflection;\n\nnamespace Pydantic;\n\n/**\n * Manually add keyword arguments to a Pydantic Field.\n * @param key: The name of the keyword argument in the Pydantic Field.\n * @param value: The value of the keyword argument in the Pydantic Field.\n */\nextern dec field(target: ModelProperty, key: valueof string, value: unknown);\n"
};
const _TypeSpecLibrary_ = {
  jsSourceFiles: TypeSpecJSSources,
  typespecSourceFiles: TypeSpecSources,
};

export { $field, $lib, $onEmit, _TypeSpecLibrary_, getFields, namespace };
