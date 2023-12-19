import { cp as EmitterResult, W as compilerAssert, cq as Placeholder, i as isTemplateDeclaration, $ as emitFile, cr as resolveDeclarationReferenceScope } from './serverlib-831c0797.js';
export { cx as CircularEmit, cu as Declaration, cw as NoEmit, cv as RawCode, cs as ReferenceCycle, ct as createAssetEmitter } from './serverlib-831c0797.js';
import './module-resolver-4ba9918f.js';

var __classPrivateFieldGet$1 = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ArrayBuilder_instances, _ArrayBuilder_setPlaceholderValue;
class ArrayBuilder extends Array {
    constructor() {
        super(...arguments);
        _ArrayBuilder_instances.add(this);
    }
    push(...values) {
        for (const v of values) {
            let toPush;
            if (v instanceof EmitterResult) {
                compilerAssert(v.kind !== "circular", "Can't push a circular emit result.");
                if (v.kind === "none") {
                    toPush = undefined;
                }
                else {
                    toPush = v.value;
                }
            }
            else {
                toPush = v;
            }
            if (toPush instanceof Placeholder) {
                toPush.onValue((v) => __classPrivateFieldGet$1(this, _ArrayBuilder_instances, "m", _ArrayBuilder_setPlaceholderValue).call(this, toPush, v));
            }
            super.push(toPush);
        }
        return values.length;
    }
}
_ArrayBuilder_instances = new WeakSet(), _ArrayBuilder_setPlaceholderValue = function _ArrayBuilder_setPlaceholderValue(p, value) {
    for (const [i, item] of this.entries()) {
        if (item === p) {
            this[i] = value;
        }
    }
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class ObjectBuilder {
    constructor(initializer = {}) {
        if (initializer instanceof Placeholder) {
            initializer.onValue((v) => {
                for (const [key, value] of Object.entries(v)) {
                    this.set(key, value);
                }
            });
        }
        else {
            for (const [key, value] of Object.entries(initializer)) {
                this.set(key, value);
            }
        }
    }
    set(key, v) {
        let value = v;
        if (v instanceof EmitterResult) {
            compilerAssert(v.kind !== "circular", "Can't set a circular emit result.");
            if (v.kind === "none") {
                this[key] = undefined;
                return;
            }
            else {
                value = v.value;
            }
        }
        if (value instanceof Placeholder) {
            value.onValue((v) => {
                this[key] = v;
            });
        }
        this[key] = value;
    }
}

var __classPrivateFieldGet = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _StringBuilder_instances, _StringBuilder_placeholders, _StringBuilder_notifyComplete, _StringBuilder_setPlaceholderValue, _StringBuilder_shouldConcatLiteral;
class StringBuilder extends Placeholder {
    constructor() {
        super(...arguments);
        _StringBuilder_instances.add(this);
        this.segments = [];
        _StringBuilder_placeholders.set(this, new Set());
    }
    pushLiteralSegment(segment) {
        if (__classPrivateFieldGet(this, _StringBuilder_instances, "m", _StringBuilder_shouldConcatLiteral).call(this)) {
            this.segments[this.segments.length - 1] += segment;
        }
        else {
            this.segments.push(segment);
        }
    }
    pushPlaceholder(ph) {
        __classPrivateFieldGet(this, _StringBuilder_placeholders, "f").add(ph);
        ph.onValue((value) => {
            __classPrivateFieldGet(this, _StringBuilder_instances, "m", _StringBuilder_setPlaceholderValue).call(this, ph, value);
        });
        this.segments.push(ph);
    }
    pushStringBuilder(builder) {
        for (const segment of builder.segments) {
            this.push(segment);
        }
    }
    push(segment) {
        if (typeof segment === "string") {
            this.pushLiteralSegment(segment);
        }
        else if (segment instanceof StringBuilder) {
            this.pushStringBuilder(segment);
        }
        else {
            this.pushPlaceholder(segment);
        }
    }
    reduce() {
        if (__classPrivateFieldGet(this, _StringBuilder_placeholders, "f").size === 0) {
            return this.segments.join("");
        }
        return this;
    }
}
_StringBuilder_placeholders = new WeakMap(), _StringBuilder_instances = new WeakSet(), _StringBuilder_notifyComplete = function _StringBuilder_notifyComplete() {
    const value = this.segments.join("");
    this.setValue(value);
}, _StringBuilder_setPlaceholderValue = function _StringBuilder_setPlaceholderValue(ph, value) {
    for (const [i, segment] of this.segments.entries()) {
        if (segment === ph) {
            this.segments[i] = value;
        }
    }
    __classPrivateFieldGet(this, _StringBuilder_placeholders, "f").delete(ph);
    if (__classPrivateFieldGet(this, _StringBuilder_placeholders, "f").size === 0) {
        __classPrivateFieldGet(this, _StringBuilder_instances, "m", _StringBuilder_notifyComplete).call(this);
    }
}, _StringBuilder_shouldConcatLiteral = function _StringBuilder_shouldConcatLiteral() {
    return this.segments.length > 0 && typeof this.segments[this.segments.length - 1] === "string";
};
function code(parts, ...substitutions) {
    const builder = new StringBuilder();
    for (const [i, literalPart] of parts.entries()) {
        builder.push(literalPart);
        if (i < substitutions.length) {
            const sub = substitutions[i];
            if (typeof sub === "string") {
                builder.push(sub);
            }
            else if (sub instanceof StringBuilder) {
                builder.pushStringBuilder(sub);
            }
            else if (sub instanceof Placeholder) {
                builder.pushPlaceholder(sub);
            }
            else {
                switch (sub.kind) {
                    case "circular":
                    case "none":
                        builder.pushLiteralSegment("");
                        break;
                    default:
                        builder.push(sub.value);
                }
            }
        }
    }
    return builder.reduce();
}

/**
 * Implement emitter logic by extending this class and passing it to
 * `emitContext.createAssetEmitter`. This class should not be constructed
 * directly.
 *
 * TypeEmitters serve two primary purposes:
 *
 * 1. Handle emitting TypeSpec types into other languages
 * 2. Set emitter context
 *
 * The generic type parameter `T` is the type you expect to produce for each TypeSpec type.
 * In the case of generating source code for a programming language, this is probably `string`
 * (in which case, consider using the `CodeTypeEmitter`) but might also be an AST node. If you
 * are emitting JSON or similar, `T` would likely be `object`.
 *
 * ## Emitting types
 *
 * Emitting TypeSpec types into other languages is accomplished by implementing
 * the AssetEmitter method that corresponds with the TypeSpec type you are
 * emitting. For example, to emit a TypeSpec model declaration, implement the
 * `modelDeclaration` method.
 *
 * TypeSpec types that have both declaration and literal forms like models or
 * unions will have separate methods. For example, models have both
 * `modelDeclaration` and `modelLiteral` methods that can be implemented
 * separately.
 *
 * Also, types which can be instantiated like models or operations have a
 * separate method for the instantiated type. For example, models have a
 * `modelInstantiation` method that gets called with such types. Generally these
 * will be treated either as if they were declarations or literals depending on
 * preference, but may also be treated specially.
 *
 * ## Emitter results
 * There are three kinds of results your methods might return - declarations,
 * raw code, or nothing.
 *
 * ### Declarations
 *
 * Create declarations by calling `this.emitter.result.declaration` passing it a
 * name and the emit output for the declaration. Note that you must have scope
 * in your context or you will get an error. If you want all declarations to be
 * emitted to the same source file, you can create a single scope in
 * `programContext` via something like:
 *
 * ```typescript
 * programContext(program: Program): Context {
 *   const sourceFile = this.emitter.createSourceFile("test.txt");
 *   return {
 *     scope: sourceFile.globalScope,
 *   };
 * }
 * ```
 *
 * ### Raw Code
 *
 * Create raw code, or emitter output that doesn't contribute to a declaration,
 * by calling `this.emitter.result.rawCode` passing it a value. Returning just a
 * value is considered raw code and so you often don't need to call this
 * directly.
 *
 * ### No Emit
 *
 * When a type doesn't contribute anything to the emitted output, return
 * `this.emitter.result.none()`.
 *
 * ## Context
 *
 * The TypeEmitter will often want to keep track of what context a type is found
 * in. There are two kinds of context - lexical context, and reference context.
 *
 * * Lexical context is context that applies to the type and every type
 *   contained inside of it. For example, lexical context for a model will apply
 *   to the model, its properties, and any nested model literals.
 * * Reference context is context that applies to types contained inside of the
 *   type and referenced anywhere inside of it. For example, reference context
 *   set on a model will apply to the model, its properties, any nested model
 *   literals, and any type referenced inside anywhere inside the model and any
 *   of the referenced types' references.
 *
 * In both cases, context is an object. It strongly recommended that the context
 * object either contain only primitive types, or else only reference immutable
 * objects.
 *
 * Set lexical by implementing the `*Context` methods of the TypeEmitter and
 * returning the context, for example `modelDeclarationContext` sets the context
 * for model declarations and the types contained inside of it.
 *
 * Set reference context by implementing the `*ReferenceContext` methods of the
 * TypeEmitter and returning the context. Note that not all types have reference
 * context methods, because not all types can actually reference anything.
 *
 * When a context method returns some context, it is merged with the current
 * context. It is not possible to remove previous context, but it can be
 * overridden with `undefined`.
 *
 * When emitting types with context, the same type might be emitted multiple
 * times if we come across that type with different contexts. For example, if we
 * have a TypeSpec program like
 *
 * ```typespec
 * model Pet { }
 * model Person {
 *   pet: Pet;
 * }
 * ```
 *
 * And we set reference context for the Person model, Pet will be emitted twice,
 * once without context and once with the reference context.
 */
class TypeEmitter {
    /**
     * @private
     *
     * Constructs a TypeEmitter. Do not use this constructor directly, instead
     * call `createAssetEmitter` on the emitter context object.
     * @param emitter The asset emitter
     */
    constructor(emitter) {
        this.emitter = emitter;
    }
    /**
     * Context shared by the entire program. In cases where you are emitting to a
     * single file, use this method to establish your main source file and set the
     * `scope` property to that source file's `globalScope`.
     * @param program
     * @returns Context
     */
    programContext(program) {
        return {};
    }
    /**
     * Emit a namespace
     *
     * @param namespace
     * @returns Emitter output
     */
    namespace(namespace) {
        for (const ns of namespace.namespaces.values()) {
            this.emitter.emitType(ns);
        }
        for (const model of namespace.models.values()) {
            if (!isTemplateDeclaration(model)) {
                this.emitter.emitType(model);
            }
        }
        for (const operation of namespace.operations.values()) {
            if (!isTemplateDeclaration(operation)) {
                this.emitter.emitType(operation);
            }
        }
        for (const enumeration of namespace.enums.values()) {
            this.emitter.emitType(enumeration);
        }
        for (const union of namespace.unions.values()) {
            if (!isTemplateDeclaration(union)) {
                this.emitter.emitType(union);
            }
        }
        for (const iface of namespace.interfaces.values()) {
            if (!isTemplateDeclaration(iface)) {
                this.emitter.emitType(iface);
            }
        }
        for (const scalar of namespace.scalars.values()) {
            this.emitter.emitType(scalar);
        }
        return this.emitter.result.none();
    }
    /**
     * Set lexical context for a namespace
     *
     * @param namespace
     */
    namespaceContext(namespace) {
        return {};
    }
    /**
     * Set reference context for a namespace.
     *
     * @param namespace
     */
    namespaceReferenceContext(namespace) {
        return {};
    }
    /**
     * Emit a model literal (e.g. as created by `{}` syntax in TypeSpec).
     *
     * @param model
     */
    modelLiteral(model) {
        if (model.baseModel) {
            this.emitter.emitType(model.baseModel);
        }
        this.emitter.emitModelProperties(model);
        return this.emitter.result.none();
    }
    /**
     * Set lexical context for a model literal.
     * @param model
     */
    modelLiteralContext(model) {
        return {};
    }
    /**
     * Set reference context for a model literal.
     * @param model
     */
    modelLiteralReferenceContext(model) {
        return {};
    }
    /**
     * Emit a model declaration (e.g. as created by `model Foo { }` syntax in
     * TypeSpec).
     *
     * @param model
     */
    modelDeclaration(model, name) {
        if (model.baseModel) {
            this.emitter.emitType(model.baseModel);
        }
        this.emitter.emitModelProperties(model);
        return this.emitter.result.none();
    }
    /**
     * Set lexical context for a model declaration.
     *
     * @param model
     * @param name the model's declaration name as retrieved from the
     * `declarationName` method.
     */
    modelDeclarationContext(model, name) {
        return {};
    }
    /**
     * Set reference context for a model declaration.
     * @param model
     */
    modelDeclarationReferenceContext(model, name) {
        return {};
    }
    /**
     * Emit a model instantiation (e.g. as created by `Box<string>` syntax in
     * TypeSpec). In some cases, `name` is undefined because a good name could
     * not be found for the instantiation. This often occurs with for instantiations
     * involving type expressions like `Box<string | int32>`.
     *
     * @param model
     * @param name The name of the instantiation as retrieved from the
     * `declarationName` method.
     */
    modelInstantiation(model, name) {
        if (model.baseModel) {
            this.emitter.emitType(model.baseModel);
        }
        this.emitter.emitModelProperties(model);
        return this.emitter.result.none();
    }
    /**
     * Set lexical context for a model instantiation.
     * @param model
     */
    modelInstantiationContext(model, name) {
        return {};
    }
    /**
     * Set reference context for a model declaration.
     * @param model
     */
    modelInstantiationReferenceContext(model, name) {
        return {};
    }
    /**
     * Emit a model's properties. Unless overridden, this method will emit each of
     * the model's properties and return a no emit result.
     *
     * @param model
     */
    modelProperties(model) {
        for (const prop of model.properties.values()) {
            this.emitter.emitModelProperty(prop);
        }
        return this.emitter.result.none();
    }
    modelPropertiesContext(model) {
        return {};
    }
    modelPropertiesReferenceContext(model) {
        return {};
    }
    /**
     * Emit a property of a model.
     *
     * @param property
     */
    modelPropertyLiteral(property) {
        this.emitter.emitTypeReference(property.type);
        return this.emitter.result.none();
    }
    /**
     * Set lexical context for a property of a model.
     *
     * @param property
     */
    modelPropertyLiteralContext(property) {
        return {};
    }
    /**
     * Set reference context for a property of a model.
     *
     * @param property
     */
    modelPropertyLiteralReferenceContext(property) {
        return {};
    }
    /**
     * Emit a model property reference (e.g. as created by the `SomeModel.prop`
     * syntax in TypeSpec). By default, this will emit the type of the referenced
     * property and return that result. In other words, the emit will look as if
     * `SomeModel.prop` were replaced with the type of `prop`.
     *
     * @param property
     */
    modelPropertyReference(property) {
        return this.emitter.emitTypeReference(property.type);
    }
    /**
     * Emit an enum member reference (e.g. as created by the `SomeEnum.member` syntax
     * in TypeSpec). By default, this will emit nothing.
     *
     * @param property the enum member
     */
    enumMemberReference(member) {
        return this.emitter.result.none();
    }
    arrayDeclaration(array, name, elementType) {
        this.emitter.emitType(array.indexer.value);
        return this.emitter.result.none();
    }
    arrayDeclarationContext(array, name, elementType) {
        return {};
    }
    arrayDeclarationReferenceContext(array, name, elementType) {
        return {};
    }
    arrayLiteral(array, elementType) {
        return this.emitter.result.none();
    }
    arrayLiteralContext(array, elementType) {
        return {};
    }
    arrayLiteralReferenceContext(array, elementType) {
        return {};
    }
    scalarDeclaration(scalar, name) {
        if (scalar.baseScalar) {
            this.emitter.emitType(scalar.baseScalar);
        }
        return this.emitter.result.none();
    }
    scalarDeclarationContext(scalar, name) {
        return {};
    }
    scalarDeclarationReferenceContext(scalar, name) {
        return {};
    }
    scalarInstantiation(scalar, name) {
        return this.emitter.result.none();
    }
    scalarInstantiationContext(scalar, name) {
        return {};
    }
    intrinsic(intrinsic, name) {
        return this.emitter.result.none();
    }
    intrinsicContext(intrinsic, name) {
        return {};
    }
    booleanLiteralContext(boolean) {
        return {};
    }
    booleanLiteral(boolean) {
        return this.emitter.result.none();
    }
    stringTemplateContext(string) {
        return {};
    }
    stringTemplate(stringTemplate) {
        return this.emitter.result.none();
    }
    stringLiteralContext(string) {
        return {};
    }
    stringLiteral(string) {
        return this.emitter.result.none();
    }
    numericLiteralContext(number) {
        return {};
    }
    numericLiteral(number) {
        return this.emitter.result.none();
    }
    operationDeclaration(operation, name) {
        this.emitter.emitOperationParameters(operation);
        this.emitter.emitOperationReturnType(operation);
        return this.emitter.result.none();
    }
    operationDeclarationContext(operation, name) {
        return {};
    }
    operationDeclarationReferenceContext(operation, name) {
        return {};
    }
    interfaceDeclarationOperationsContext(iface) {
        return {};
    }
    interfaceDeclarationOperationsReferenceContext(iface) {
        return {};
    }
    interfaceOperationDeclarationContext(operation, name) {
        return {};
    }
    interfaceOperationDeclarationReferenceContext(operation, name) {
        return {};
    }
    operationParameters(operation, parameters) {
        return this.emitter.result.none();
    }
    operationParametersContext(operation, parameters) {
        return {};
    }
    operationParametersReferenceContext(operation, parameters) {
        return {};
    }
    operationReturnType(operation, returnType) {
        return this.emitter.result.none();
    }
    operationReturnTypeContext(operation, returnType) {
        return {};
    }
    operationReturnTypeReferenceContext(operation, returnType) {
        return {};
    }
    interfaceDeclaration(iface, name) {
        this.emitter.emitInterfaceOperations(iface);
        return this.emitter.result.none();
    }
    interfaceDeclarationContext(iface, name) {
        return {};
    }
    interfaceDeclarationReferenceContext(iface, name) {
        return {};
    }
    interfaceDeclarationOperations(iface) {
        for (const op of iface.operations.values()) {
            this.emitter.emitInterfaceOperation(op);
        }
        return this.emitter.result.none();
    }
    interfaceOperationDeclaration(operation, name) {
        this.emitter.emitOperationParameters(operation);
        this.emitter.emitOperationReturnType(operation);
        return this.emitter.result.none();
    }
    enumDeclaration(en, name) {
        this.emitter.emitEnumMembers(en);
        return this.emitter.result.none();
    }
    enumDeclarationContext(en, name) {
        return {};
    }
    enumDeclarationReferenceContext(en, name) {
        return {};
    }
    enumMembers(en) {
        for (const member of en.members.values()) {
            this.emitter.emitType(member);
        }
        return this.emitter.result.none();
    }
    enumMembersContext(en) {
        return {};
    }
    enumMember(member) {
        return this.emitter.result.none();
    }
    enumMemberContext(member) {
        return {};
    }
    unionDeclaration(union, name) {
        this.emitter.emitUnionVariants(union);
        return this.emitter.result.none();
    }
    unionDeclarationContext(union) {
        return {};
    }
    unionDeclarationReferenceContext(union) {
        return {};
    }
    unionInstantiation(union, name) {
        this.emitter.emitUnionVariants(union);
        return this.emitter.result.none();
    }
    unionInstantiationContext(union, name) {
        return {};
    }
    unionInstantiationReferenceContext(union, name) {
        return {};
    }
    unionLiteral(union) {
        this.emitter.emitUnionVariants(union);
        return this.emitter.result.none();
    }
    unionLiteralContext(union) {
        return {};
    }
    unionLiteralReferenceContext(union) {
        return {};
    }
    unionVariants(union) {
        for (const variant of union.variants.values()) {
            this.emitter.emitType(variant);
        }
        return this.emitter.result.none();
    }
    unionVariantsContext() {
        return {};
    }
    unionVariantsReferenceContext() {
        return {};
    }
    unionVariant(variant) {
        this.emitter.emitTypeReference(variant.type);
        return this.emitter.result.none();
    }
    unionVariantContext(union) {
        return {};
    }
    unionVariantReferenceContext(union) {
        return {};
    }
    tupleLiteral(tuple) {
        this.emitter.emitTupleLiteralValues(tuple);
        return this.emitter.result.none();
    }
    tupleLiteralContext(tuple) {
        return {};
    }
    tupleLiteralValues(tuple) {
        for (const value of tuple.values.values()) {
            this.emitter.emitType(value);
        }
        return this.emitter.result.none();
    }
    tupleLiteralValuesContext(tuple) {
        return {};
    }
    tupleLiteralValuesReferenceContext(tuple) {
        return {};
    }
    tupleLiteralReferenceContext(tuple) {
        return {};
    }
    sourceFile(sourceFile) {
        const emittedSourceFile = {
            path: sourceFile.path,
            contents: "",
        };
        for (const decl of sourceFile.globalScope.declarations) {
            emittedSourceFile.contents += decl.value + "\n";
        }
        return emittedSourceFile;
    }
    async writeOutput(sourceFiles) {
        for (const file of sourceFiles) {
            const outputFile = await this.emitter.emitSourceFile(file);
            await emitFile(this.emitter.getProgram(), {
                path: outputFile.path,
                content: outputFile.contents,
            });
        }
    }
    reference(targetDeclaration, pathUp, pathDown, commonScope) {
        return this.emitter.result.none();
    }
    /**
     * Handle circular references. When this method is called it means we are resolving a circular reference.
     * By default if the target is a declaration it will call to {@link reference} otherwise it means we have an inline reference
     * @param target Reference target.
     * @param scope Current scope.
     * @returns Resolved reference entity.
     */
    circularReference(target, scope, cycle) {
        if (!cycle.containsDeclaration) {
            throw new Error(`Circular references to non-declarations are not supported by this emitter. Cycle:\n${cycle}`);
        }
        if (target.kind !== "declaration") {
            return target;
        }
        compilerAssert(scope, "Emit context must have a scope set in order to create references to declarations.");
        const { pathUp, pathDown, commonScope } = resolveDeclarationReferenceScope(target, scope);
        return this.reference(target, pathUp, pathDown, commonScope);
    }
    declarationName(declarationType) {
        compilerAssert(declarationType.name !== undefined, "Can't emit a declaration that doesn't have a name.");
        if (declarationType.kind === "Enum" || declarationType.kind === "Intrinsic") {
            return declarationType.name;
        }
        // for operations inside interfaces, we don't want to do the fancy thing because it will make
        // operations inside instantiated interfaces get weird names
        if (declarationType.kind === "Operation" && declarationType.interface) {
            return declarationType.name;
        }
        if (!declarationType.templateMapper) {
            return declarationType.name;
        }
        let unspeakable = false;
        const parameterNames = declarationType.templateMapper.args.map((t) => {
            switch (t.kind) {
                case "Model":
                case "Scalar":
                case "Interface":
                case "Operation":
                case "Enum":
                case "Union":
                case "Intrinsic":
                    if (!t.name) {
                        unspeakable = true;
                        return undefined;
                    }
                    const declName = this.emitter.emitDeclarationName(t);
                    if (declName === undefined) {
                        unspeakable = true;
                        return undefined;
                    }
                    return declName[0].toUpperCase() + declName.slice(1);
                default:
                    unspeakable = true;
                    return undefined;
            }
        });
        if (unspeakable) {
            return undefined;
        }
        return declarationType.name + parameterNames.join("");
    }
}
/**
 * A subclass of `TypeEmitter<string>` that makes working with strings a bit easier.
 * In particular, when emitting members of a type (`modelProperties`, `enumMembers`, etc.),
 * instead of returning no result, it returns the value of each of the members concatenated
 * by commas. It will also construct references by concatenating namespace elements together
 * with `.` which should work nicely in many object oriented languages.
 */
class CodeTypeEmitter extends TypeEmitter {
    modelProperties(model) {
        const builder = new StringBuilder();
        let i = 0;
        for (const prop of model.properties.values()) {
            i++;
            const propVal = this.emitter.emitModelProperty(prop);
            builder.push(code `${propVal}${i < model.properties.size ? "," : ""}`);
        }
        return this.emitter.result.rawCode(builder.reduce());
    }
    interfaceDeclarationOperations(iface) {
        const builder = new StringBuilder();
        let i = 0;
        for (const op of iface.operations.values()) {
            i++;
            builder.push(code `${this.emitter.emitInterfaceOperation(op)}${i < iface.operations.size ? "," : ""}`);
        }
        return builder.reduce();
    }
    enumMembers(en) {
        const builder = new StringBuilder();
        let i = 0;
        for (const enumMember of en.members.values()) {
            i++;
            builder.push(code `${this.emitter.emitType(enumMember)}${i < en.members.size ? "," : ""}`);
        }
        return builder.reduce();
    }
    unionVariants(union) {
        const builder = new StringBuilder();
        let i = 0;
        for (const v of union.variants.values()) {
            i++;
            builder.push(code `${this.emitter.emitType(v)}${i < union.variants.size ? "," : ""}`);
        }
        return builder.reduce();
    }
    tupleLiteralValues(tuple) {
        const builder = new StringBuilder();
        let i = 0;
        for (const v of tuple.values) {
            i++;
            builder.push(code `${this.emitter.emitTypeReference(v)}${i < tuple.values.length ? "," : ""}`);
        }
        return builder.reduce();
    }
    reference(targetDeclaration, pathUp, pathDown, commonScope) {
        const basePath = pathDown.map((s) => s.name).join(".");
        return basePath
            ? this.emitter.result.rawCode(basePath + "." + targetDeclaration.name)
            : this.emitter.result.rawCode(targetDeclaration.name);
    }
}

export { ArrayBuilder, CodeTypeEmitter, EmitterResult, ObjectBuilder, Placeholder, StringBuilder, TypeEmitter, code };