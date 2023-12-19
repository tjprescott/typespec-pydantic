import { i as isTemplateDeclaration, a as isTemplateDeclarationOrInstance, p as projectProgram, f as formatter, b as f0 } from './serverlib-831c0797.js';
export { c1 as $deprecated, ca as $discriminator, aZ as $doc, a_ as $docFromComment, bF as $encode, bh as $error, b5 as $errorsDoc, bj as $format, bV as $friendlyName, ba as $indexer, b8 as $inspectType, b9 as $inspectTypeName, bZ as $key, bX as $knownValues, bP as $list, bt as $maxItems, bp as $maxLength, bx as $maxValue, bB as $maxValueExclusive, br as $minItems, bn as $minLength, bv as $minValue, bz as $minValueExclusive, c3 as $overload, cd as $parameterVisibility, bl as $pattern, c6 as $projectedName, cf as $returnTypeVisibility, b2 as $returnsDoc, bD as $secret, cl as $service, aX as $summary, bS as $tag, bH as $visibility, c0 as $withDefaultKeyVisibility, bL as $withOptionalProperties, bM as $withUpdateableProperties, bJ as $withVisibility, bO as $withoutDefaultValues, bN as $withoutOmittedProperties, D as DuplicateTracker, aG as EventEmitter, aT as IdentifierKind, ap as Keywords, aV as ListenerFlow, M as MANIFEST, aU as NoTarget, P as ProjectionError, Q as Queue, cm as SemanticTokenKind, aS as SyntaxKind, an as Token, ao as TokenDisplay, aq as TokenFlags, T as TwoLevelMap, aa as UsageFlags, ck as addService, X as assertType, F as cadlTypeToJson, l as cadlVersion, a1 as checkFormatCadl, a2 as checkFormatTypeSpec, al as compile, W as compilerAssert, c as createCadlLibrary, m as createChecker, C as createDecoratorDefinition, Z as createDiagnosticCollector, N as createDiagnosticCreator, j as createRekeyableMap, d as createRule, ax as createScanner, cn as createServer, S as createSourceFile, am as createStateAccessors, e as createTypeSpecLibrary, $ as emitFile, o as filterModelProperties, u as finishTypeForProgram, R as formatDiagnostic, a3 as formatIdentifier, a0 as formatTypeSpec, bU as getAllTags, co as getCompletionNodeAtPosition, c2 as getDeprecated, K as getDeprecationDetails, cc as getDiscriminatedTypes, a4 as getDiscriminatedUnion, cb as getDiscriminator, b1 as getDoc, b0 as getDocData, a$ as getDocDataInternal, n as getEffectiveModelType, bG as getEncode, b7 as getErrorsDoc, b6 as getErrorsDocData, ai as getFirstAncestor, bk as getFormat, bW as getFriendlyName, aR as getFullyQualifiedSymbolName, aj as getIdentifierContext, bb as getIndexer, b$ as getKeyName, bY as getKnownValues, bQ as getListOperationType, a5 as getLocationContext, bu as getMaxItems, bq as getMaxLength, by as getMaxValue, bC as getMaxValueExclusive, bs as getMinItems, bo as getMinLength, bw as getMinValue, bA as getMinValueExclusive, a9 as getNamespaceFullName, af as getNodeAtPosition, c5 as getOverloadedOperation, c4 as getOverloads, q as getOverriddenProperty, ce as getParameterVisibility, aM as getParentTemplateNode, bm as getPattern, c8 as getProjectedName, c7 as getProjectedNames, aF as getProperty, bg as getPropertyType, cg as getReturnTypeVisibility, b4 as getReturnsDoc, b3 as getReturnsDocData, ci as getService, k as getSourceFileKindFromExt, U as getSourceLocation, aY as getSummary, bT as getTags, a7 as getTypeName, bI as getVisibility, ag as hasParseError, c9 as hasProjectedName, _ as ignoreDiagnostics, be as isArrayModelType, z as isCadlValueTypeOf, as as isComment, aQ as isDeclaredInNamespace, aO as isDeclaredType, J as isDeprecated, bi as isErrorModel, aH as isErrorType, aP as isGlobalNamespace, ah as isImportStatement, x as isIntrinsicType, b_ as isKey, at as isKeyword, bR as isListOperation, av as isModifier, aJ as isNeverType, aL as isNullType, bd as isNumericType, ak as isProjectedProgram, au as isPunctuation, bf as isRecordModelType, bE as isSecret, cj as isService, aw as isStatementKeyword, a8 as isStdNamespace, bc as isStringType, aN as isTemplateInstance, ar as isTrivia, A as isTypeSpecValueTypeOf, aK as isUnknownType, bK as isVisible, aI as isVoidType, ch as listServices, O as logDiagnostics, V as logVerboseTestOutput, aE as mapEventEmitterToNodeListener, L as markDeprecated, aW as namespace, aA as navigateProgram, aB as navigateType, aD as navigateTypesInNamespace, g as paramMessage, ac as parse, ad as parseStandaloneTypeReference, Y as reportDeprecated, r as resolveCompilerOptions, ab as resolveUsages, aC as scopeNavigationToNamespace, s as setCadlNamespace, h as setTypeSpecNamespace, ay as skipTrivia, az as skipWhiteSpace, a6 as stringTemplateToString, G as typespecTypeToJson, t as typespecVersion, I as validateDecoratorNotOnType, E as validateDecoratorParamCount, B as validateDecoratorParamType, v as validateDecoratorTarget, y as validateDecoratorTargetIntrinsic, H as validateDecoratorUniqueOnNode, ae as visitChildren, w as walkPropertiesInherited } from './serverlib-831c0797.js';
export { R as ResolveModuleError, a as altDirectorySeparator, d as directorySeparator, x as ensurePathIsNonModuleName, u as ensureTrailingDirectorySeparator, h as getAnyExtensionFromPath, f as getBaseFileName, e as getDirectoryPath, o as getNormalizedAbsolutePath, q as getNormalizedAbsolutePathWithoutRoot, n as getNormalizedPathComponents, j as getPathComponents, s as getPathFromPathComponents, y as getRelativePathFromDirectory, g as getRootLength, v as hasTrailingDirectorySeparator, i as isAnyDirectorySeparator, c as isPathAbsolute, b as isUrl, l as joinPaths, p as normalizePath, w as normalizeSlashes, k as reducePathComponents, t as removeTrailingDirectorySeparator, r as resolveModule, m as resolvePath } from './module-resolver-4ba9918f.js';

const NodeHost = undefined;

/**
 * List operations in the given container. Will list operation recursively by default(Check subnamespaces.)
 * @param container Container.
 * @param options Options.
 */
function listOperationsIn(container, options = {}) {
    const operations = [];
    function addOperations(current) {
        var _a;
        if (current.kind === "Interface" && isTemplateDeclaration(current)) {
            // Skip template interface operations
            return;
        }
        for (const op of current.operations.values()) {
            // Skip templated operations
            if (!isTemplateDeclarationOrInstance(op)) {
                operations.push(op);
            }
        }
        if (current.kind === "Namespace") {
            const recursive = (_a = options.recursive) !== null && _a !== void 0 ? _a : true;
            const children = [
                ...(recursive ? current.namespaces.values() : []),
                ...current.interfaces.values(),
            ];
            for (const child of children) {
                addOperations(child);
            }
        }
    }
    addOperations(container);
    return operations;
}

const VariableInterpolationRegex = /{([a-zA-Z-_.]+)}(\/|\.?)/g;
/**
 * Interpolate a path template
 * @param pathTemplate Path template
 * @param predefinedVariables Variables that can be used in the path template.
 * @returns
 */
function interpolatePath(pathTemplate, predefinedVariables) {
    return pathTemplate.replace(VariableInterpolationRegex, (match, expression, suffix) => {
        const isPathSegment = suffix === "/" || suffix === ".";
        const resolved = resolveExpression(predefinedVariables, expression);
        if (resolved) {
            return isPathSegment ? `${resolved}${suffix}` : resolved;
        }
        return "";
    });
}
function resolveExpression(predefinedVariables, expression) {
    const segments = expression.split(".");
    let resolved = predefinedVariables;
    for (const segment of segments) {
        resolved = resolved[segment];
        if (resolved === undefined) {
            return undefined;
        }
    }
    if (typeof resolved === "string") {
        return resolved;
    }
    else {
        return undefined;
    }
}

/**
 * Create an helper to manager project names.
 * @param program Program
 * @param target Name of the projected name target(e.g. json, csharp, etc.)
 * @returns ProjectedNameView
 */
function createProjectedNameProgram(program, target) {
    const projectedProgram = projectProgram(program, [
        {
            projectionName: "target",
            arguments: [target],
        },
    ]);
    return {
        program: projectedProgram,
        getProjectedName,
    };
    function getProjectedName(type) {
        const baseType = findTypeInProjector(projectedProgram.projector, type);
        const projectedType = projectedProgram.projector.projectedTypes.get(baseType);
        if (projectedType === undefined ||
            !("name" in projectedType) ||
            projectedType.name === baseType.name) {
            return type.name;
        }
        return projectedType.name;
    }
}
// TODO will REALM help here?
function findTypeInProjector(projector, type) {
    if (type.projectionSource === undefined) {
        return type;
    }
    else if (type.projector === projector) {
        return type;
    }
    else {
        return findTypeInProjector(projector, type.projectionSource);
    }
}

/**
 * TypeSpec Language configuration. Format: https://code.visualstudio.com/api/language-extensions/language-configuration-guide
 * @hidden Typedoc causing issue with this
 */
const TypeSpecLanguageConfiguration = {
    comments: {
        lineComment: "//",
        blockComment: ["/*", "*/"],
    },
    brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
    ],
    autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        // NOTE: autoclose for double quotes may interfere with typing """
        { open: '"', close: '"' },
        { open: "/**", close: " */", notIn: ["string"] },
    ],
    surroundingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
    ],
    // From https://github.com/microsoft/vscode/blob/main/extensions/javascript/javascript-language-configuration.json
    indentationRules: {
        decreaseIndentPattern: {
            pattern: "^((?!.*?/\\*).*\\*/)?\\s*[\\}\\]].*$",
        },
        increaseIndentPattern: {
            pattern: "^((?!//).)*(\\{([^}\"'`/]*|(\\t|[ ])*//.*)|\\([^)\"'`/]*|\\[[^\\]\"'`/]*)$",
        },
        // e.g.  * ...| or */| or *-----*/|
        unIndentedLinePattern: {
            pattern: "^(\\t|[ ])*[ ]\\*[^/]*\\*/\\s*$|^(\\t|[ ])*[ ]\\*/\\s*$|^(\\t|[ ])*[ ]\\*([ ]([^\\*]|\\*(?!/))*)?$",
        },
    },
    onEnterRules: [
        {
            // e.g. /** | */
            beforeText: {
                pattern: "^\\s*/\\*\\*(?!/)([^\\*]|\\*(?!/))*$",
            },
            afterText: {
                pattern: "^\\s*\\*/$",
            },
            action: {
                indent: "indentOutdent",
                appendText: " * ",
            },
        },
        {
            // e.g. /** ...|
            beforeText: {
                pattern: "^\\s*/\\*\\*(?!/)([^\\*]|\\*(?!/))*$",
            },
            action: {
                indent: "none",
                appendText: " * ",
            },
        },
        {
            // e.g.  * ...|
            beforeText: {
                pattern: "^(\\t|[ ])*[ ]\\*([ ]([^\\*]|\\*(?!/))*)?$",
            },
            previousLineText: {
                pattern: "(?=^(\\s*(/\\*\\*|\\*)).*)(?=(?!(\\s*\\*/)))",
            },
            action: {
                indent: "none",
                appendText: "* ",
            },
        },
        {
            // e.g.  */|
            beforeText: {
                pattern: "^(\\t|[ ])*[ ]\\*/\\s*$",
            },
            action: {
                indent: "none",
                removeText: 1,
            },
        },
        {
            // e.g.  *-----*/|
            beforeText: {
                pattern: "^(\\t|[ ])*[ ]\\*[^/]*\\*/\\s*$",
            },
            action: {
                indent: "none",
                removeText: 1,
            },
        },
    ],
};
/**
 * @deprecated Use TypeSpecLanguageConfiguration
 * @hidden
 */
const CadlLanguageConfiguration = TypeSpecLanguageConfiguration;

const TypeSpecPrettierPlugin = formatter;
/** @deprecated Use TypeSpecPrettierPlugin */
const CadlPrettierPlugin = TypeSpecPrettierPlugin;

const TypeSpecJSSources = {
"dist/src/lib/decorators.js": f0,
};
const TypeSpecSources = {
  "package.json": "{\"name\":\"@typespec/compiler\",\"version\":\"0.51.0\",\"description\":\"TypeSpec Compiler Preview\",\"author\":\"Microsoft Corporation\",\"license\":\"MIT\",\"homepage\":\"https://microsoft.github.io/typespec\",\"readme\":\"https://github.com/microsoft/typespec/blob/main/README.md\",\"repository\":{\"type\":\"git\",\"url\":\"git+https://github.com/microsoft/typespec.git\"},\"bugs\":{\"url\":\"https://github.com/microsoft/typespec/issues\"},\"keywords\":[\"typespec\",\"cli\"],\"type\":\"module\",\"main\":\"dist/src/index.js\",\"tspMain\":\"lib/main.tsp\",\"exports\":{\".\":{\"types\":\"./dist/src/index.d.ts\",\"default\":\"./dist/src/index.js\"},\"./testing\":{\"types\":\"./dist/src/testing/index.d.ts\",\"default\":\"./dist/src/testing/index.js\"},\"./module-resolver\":{\"types\":\"./dist/src/core/module-resolver.d.ts\",\"default\":\"./dist/src/core/module-resolver.js\"},\"./emitter-framework\":{\"types\":\"./dist/src/emitter-framework/index.d.ts\",\"default\":\"./dist/src/emitter-framework/index.js\"}},\"browser\":{\"./dist/src/core/node-host.js\":\"./dist/src/core/node-host.browser.js\",\"./dist/src/core/logger/console-sink.js\":\"./dist/src/core/logger/console-sink.browser.js\"},\"engines\":{\"node\":\">=18.0.0\"},\"bin\":{\"tsp\":\"cmd/tsp.js\",\"tsp-server\":\"cmd/tsp-server.js\"},\"files\":[\"lib/*.tsp\",\"dist/**\",\"entrypoints\",\"!dist/test/**\"],\"dependencies\":{\"@babel/code-frame\":\"~7.22.13\",\"ajv\":\"~8.12.0\",\"picocolors\":\"~1.0.0\",\"globby\":\"~13.2.2\",\"yaml\":\"~2.3.2\",\"mustache\":\"~4.2.0\",\"prettier\":\"~3.1.0\",\"prompts\":\"~2.4.2\",\"semver\":\"^7.5.4\",\"vscode-languageserver\":\"~9.0.0\",\"vscode-languageserver-textdocument\":\"~1.0.8\",\"yargs\":\"~17.7.2\",\"change-case\":\"~4.1.2\"},\"devDependencies\":{\"@types/babel__code-frame\":\"~7.0.4\",\"@types/mocha\":\"~10.0.1\",\"@types/mustache\":\"~4.2.2\",\"@types/node\":\"~18.11.9\",\"@types/prompts\":\"~2.4.4\",\"@types/semver\":\"^7.5.2\",\"@types/yargs\":\"~17.0.24\",\"@typespec/eslint-config-typespec\":\"~0.51.0\",\"@typespec/internal-build-utils\":\"~0.51.0\",\"eslint\":\"^8.49.0\",\"grammarkdown\":\"~3.3.2\",\"mocha\":\"~10.2.0\",\"mocha-junit-reporter\":\"~2.2.1\",\"mocha-multi-reporters\":\"~1.5.1\",\"c8\":\"~8.0.1\",\"prettier-plugin-organize-imports\":\"~3.2.3\",\"source-map-support\":\"~0.5.21\",\"rimraf\":\"~5.0.1\",\"tmlanguage-generator\":\"~0.5.1\",\"typescript\":\"~5.2.2\",\"vscode-oniguruma\":\"~2.0.1\",\"vscode-textmate\":\"~9.0.0\",\"sinon\":\"~17.0.1\",\"@types/sinon\":\"~10.0.20\"},\"scripts\":{\"clean\":\"rimraf ./dist ./temp\",\"build\":\"npm run gen-manifest && npm run compile && npm run generate-tmlanguage\",\"compile\":\"tsc -p .\",\"watch\":\"tsc -p . --watch\",\"watch-tmlanguage\":\"node scripts/watch-tmlanguage.js\",\"generate-tmlanguage\":\"node scripts/generate-tmlanguage.js\",\"dogfood\":\"node scripts/dogfood.js\",\"test\":\"mocha\",\"test-official\":\"c8 mocha --forbid-only --reporter mocha-multi-reporters\",\"gen-manifest\":\"node scripts/generate-manifest.js\",\"regen-nonascii\":\"node scripts/regen-nonascii.js\",\"fuzz\":\"node dist/test/manual/fuzz.js run\",\"lint\":\"eslint . --ext .ts --max-warnings=0\",\"lint:fix\":\"eslint . --fix --ext .ts\"}}",
  "lib/main.tsp": "import \"./lib.tsp\";\nimport \"./decorators.tsp\";\nimport \"./reflection.tsp\";\nimport \"./projected-names.tsp\";\n",
  "lib/lib.tsp": "namespace TypeSpec;\n\n/**\n * Represent a byte array\n */\nscalar bytes;\n\n/**\n * A numeric type\n */\nscalar numeric;\n\n/**\n * A whole number. This represent any `integer` value possible.\n * It is commonly represented as `BigInteger` in some languages.\n */\nscalar integer extends numeric;\n\n/**\n * A number with decimal value\n */\nscalar float extends numeric;\n\n/**\n * A 64-bit integer. (`-9,223,372,036,854,775,808` to `9,223,372,036,854,775,807`)\n */\nscalar int64 extends integer;\n\n/**\n * A 32-bit integer. (`-2,147,483,648` to `2,147,483,647`)\n */\nscalar int32 extends int64;\n\n/**\n * A 16-bit integer. (`-32,768` to `32,767`)\n */\nscalar int16 extends int32;\n\n/**\n * A 8-bit integer. (`-128` to `127`)\n */\nscalar int8 extends int16;\n\n/**\n * A 64-bit unsigned integer (`0` to `18,446,744,073,709,551,615`)\n */\nscalar uint64 extends integer;\n\n/**\n * A 32-bit unsigned integer (`0` to `4,294,967,295`)\n */\nscalar uint32 extends uint64;\n\n/**\n * A 16-bit unsigned integer (`0` to `65,535`)\n */\nscalar uint16 extends uint32;\n\n/**\n * A 8-bit unsigned integer (`0` to `255`)\n */\nscalar uint8 extends uint16;\n\n/**\n * An integer that can be serialized to JSON (`−9007199254740991 (−(2^53 − 1))` to `9007199254740991 (2^53 − 1)` )\n */\nscalar safeint extends int64;\n\n/**\n * A 32 bit floating point number. (`±1.5 x 10^−45` to `±3.4 x 10^38`)\n */\nscalar float64 extends float;\n\n/**\n * A 32 bit floating point number. (`±5.0 × 10^−324` to `±1.7 × 10^308`)\n */\nscalar float32 extends float64;\n\n/**\n * A decimal number with any length and precision. This represent any `decimal` value possible.\n * It is commonly represented as `BigDecimal` in some languages.\n */\nscalar decimal extends numeric;\n\n/**\n * A 128-bit decimal number.\n */\nscalar decimal128 extends decimal;\n\n/**\n * A sequence of textual characters.\n */\nscalar string;\n\n/**\n * A date on a calendar without a time zone, e.g. \"April 10th\"\n */\nscalar plainDate;\n\n/**\n * A time on a clock without a time zone, e.g. \"3:00 am\"\n */\nscalar plainTime;\n\n/**\n * An instant in coordinated universal time (UTC)\"\n */\nscalar utcDateTime;\n\n/**\n * A date and time in a particular time zone, e.g. \"April 10th at 3:00am in PST\"\n */\nscalar offsetDateTime;\n\n/**\n * A duration/time period. e.g 5s, 10h\n */\nscalar duration;\n\n/**\n * Boolean with `true` and `false` values.\n */\nscalar boolean;\n\n/**\n * Represent a 32-bit unix timestamp datetime with 1s of granularity.\n * It measures time by the number of seconds that have elapsed since 00:00:00 UTC on 1 January 1970.\n *\n */\n@encode(\"unixTimestamp\", int32)\nscalar unixTimestamp32 extends utcDateTime;\n\n/**\n * Represent a model\n */\n// Deprecated June 2023 sprint\n#deprecated \"object is deprecated. Please use {} for an empty model, `Record<unknown>` for a record with unknown property types, `unknown[]` for an array.\"\nmodel object {}\n\n/**\n * @dev Array model type, equivalent to `T[]`\n * @template T The type of the array elements\n */\n@indexer(integer, T)\nmodel Array<T> {}\n\n/**\n * @dev Model with string properties where all the properties have type `T`\n * @template T The type of the properties\n */\n@indexer(string, T)\nmodel Record<T> {}\n\n/**\n * Represent a URL string as described by https://url.spec.whatwg.org/\n */\nscalar url extends string;\n\n/**\n * Represents a collection of optional properties.\n * @template T An object whose spread properties are all optional.\n */\n@doc(\"The template for adding optional properties.\")\n@withOptionalProperties\nmodel OptionalProperties<T> {\n  ...T;\n}\n\n/**\n * Represents a collection of updateable properties.\n * @template T An object whose spread properties are all updateable.\n */\n@doc(\"The template for adding updateable properties.\")\n@withUpdateableProperties\nmodel UpdateableProperties<T> {\n  ...T;\n}\n\n/**\n * Represents a collection of omitted properties.\n * @template T An object whose properties are spread.\n * @template TKeys The property keys to omit.\n */\n@doc(\"The template for omitting properties.\")\n@withoutOmittedProperties(TKeys)\nmodel OmitProperties<T, TKeys extends string> {\n  ...T;\n}\n\n/**\n * Represents a collection of properties with default values omitted.\n * @template T An object whose spread property defaults are all omitted.\n */\n@withoutDefaultValues\nmodel OmitDefaults<T> {\n  ...T;\n}\n\n/**\n * Applies a visibility setting to a collection of properties.\n * @template T An object whose properties are spread.\n * @template Visibility The visibility to apply to all properties.\n */\n@doc(\"The template for setting the default visibility of key properties.\")\n@withDefaultKeyVisibility(Visibility)\nmodel DefaultKeyVisibility<T, Visibility extends valueof string> {\n  ...T;\n}\n",
  "lib/decorators.tsp": "import \"../dist/src/lib/decorators.js\";\n\nusing TypeSpec.Reflection;\n\nnamespace TypeSpec;\n\n/**\n * Typically a short, single-line description.\n * @param summary Summary string.\n *\n * @example\n * ```typespec\n * @summary(\"This is a pet\")\n * model Pet {}\n * ```\n */\nextern dec summary(target: unknown, summary: valueof string);\n\n/**\n * Attach a documentation string.\n * @param doc Documentation string\n * @param formatArgs Record with key value pair that can be interpolated in the doc.\n *\n * @example\n * ```typespec\n * @doc(\"Represent a Pet available in the PetStore\")\n * model Pet {}\n * ```\n */\nextern dec doc(target: unknown, doc: valueof string, formatArgs?: {});\n\n/**\n * Attach a documentation string to describe the successful return types of an operation.\n * If an operation returns a union of success and errors it only describe the success. See `@errorsDoc` for error documentation.\n * @param doc Documentation string\n *\n * @example\n * ```typespec\n * @returnsDoc(\"Returns doc\")\n * op get(): Pet | NotFound;\n * ```\n */\nextern dec returnsDoc(target: Operation, doc: valueof string);\n\n/**\n * Attach a documentation string to describe the error return types of an operation.\n * If an operation returns a union of success and errors it only describe the errors. See `@errorsDoc` for success documentation.\n * @param doc Documentation string\n *\n * @example\n * ```typespec\n * @errorsDoc(\"Returns doc\")\n * op get(): Pet | NotFound;\n * ```\n */\nextern dec errorsDoc(target: Operation, doc: valueof string);\n\n/**\n * Mark this type as deprecated.\n *\n * NOTE: This decorator **should not** be used, use the `#deprecated` directive instead.\n *\n * @deprecated Use the `#deprecated` directive instead.\n * @param message Deprecation message.\n *\n * @example\n *\n * Use the `#deprecated` directive instead:\n *\n * ```typespec\n * #deprecated \"Use ActionV2\"\n * op Action<T>(): T;\n * ```\n */\n#deprecated \"@deprecated decorator is deprecated. Use the `#deprecated` directive instead.\"\nextern dec deprecated(target: unknown, message: valueof string);\n\n/**\n * Service options.\n */\nmodel ServiceOptions {\n  /**\n   * Title of the service.\n   */\n  title?: string;\n\n  /**\n   * Version of the service.\n   */\n  version?: string;\n}\n\n/**\n * Mark this namespace as describing a service and configure service properties.\n * @param options Optional configuration for the service.\n *\n * @example\n * ```typespec\n * @service\n * namespace PetStore;\n * ```\n *\n * @example Setting service title\n * ```typespec\n * @service({title: \"Pet store\"})\n * namespace PetStore;\n * ```\n *\n * @example Setting service version\n * ```typespec\n * @service({version: \"1.0\"})\n * namespace PetStore;\n * ```\n */\nextern dec service(target: Namespace, options?: ServiceOptions);\n\n/**\n * Specify that this model is an error type. Operations return error types when the operation has failed.\n *\n * @example\n * ```typespec\n * @error\n * model PetStoreError {\n *   code: string;\n *   message: string;\n * }\n * ```\n */\nextern dec error(target: Model);\n\n/**\n * Specify a known data format hint for this string type. For example `uuid`, `uri`, etc.\n * This differs from the `@pattern` decorator which is meant to specify a regular expression while `@format` accepts a known format name.\n * The format names are open ended and are left to emitter to interpret.\n *\n * @param format format name.\n *\n * @example\n * ```typespec\n * @format(\"uuid\")\n * scalar uuid extends string;\n * ```\n */\nextern dec format(target: string | bytes | ModelProperty, format: valueof string);\n\n/**\n * Specify the the pattern this string should respect using simple regular expression syntax.\n * The following syntax is allowed: alternations (`|`), quantifiers (`?`, `*`, `+`, and `{ }`), wildcard (`.`), and grouping parentheses.\n * Advanced features like look-around, capture groups, and references are not supported.\n *\n * @param pattern Regular expression.\n *\n * @example\n * ```typespec\n * @pattern(\"[a-z]+\")\n * scalar LowerAlpha extends string;\n * ```\n */\nextern dec pattern(target: string | bytes | ModelProperty, pattern: valueof string);\n\n/**\n * Specify the minimum length this string type should be.\n * @param value Minimum length\n *\n * @example\n * ```typespec\n * @minLength(2)\n * scalar Username extends string;\n * ```\n */\nextern dec minLength(target: string | ModelProperty, value: valueof integer);\n\n/**\n * Specify the maximum length this string type should be.\n * @param value Maximum length\n *\n * @example\n * ```typespec\n * @maxLength(20)\n * scalar Username extends string;\n * ```\n */\nextern dec maxLength(target: string | ModelProperty, value: valueof integer);\n\n/**\n * Specify the minimum number of items this array should have.\n * @param value Minimum number\n *\n * @example\n * ```typespec\n * @minItems(1)\n * model Endpoints is string[];\n * ```\n */\nextern dec minItems(target: unknown[] | ModelProperty, value: valueof integer);\n\n/**\n * Specify the maximum number of items this array should have.\n * @param value Maximum number\n *\n * @example\n * ```typespec\n * @maxItems(5)\n * model Endpoints is string[];\n * ```\n */\nextern dec maxItems(target: unknown[] | ModelProperty, value: valueof integer);\n\n/**\n * Specify the minimum value this numeric type should be.\n * @param value Minimum value\n *\n * @example\n * ```typespec\n * @minValue(18)\n * scalar Age is int32;\n * ```\n */\nextern dec minValue(target: numeric | ModelProperty, value: valueof numeric);\n\n/**\n * Specify the maximum value this numeric type should be.\n * @param value Maximum value\n *\n * @example\n * ```typespec\n * @maxValue(200)\n * scalar Age is int32;\n * ```\n */\nextern dec maxValue(target: numeric | ModelProperty, value: valueof numeric);\n\n/**\n * Specify the minimum value this numeric type should be, exclusive of the given\n * value.\n * @param value Minimum value\n *\n * @example\n * ```typespec\n * @minValueExclusive(0)\n * scalar distance is float64;\n * ```\n */\nextern dec minValueExclusive(target: numeric | ModelProperty, value: valueof numeric);\n\n/**\n * Specify the maximum value this numeric type should be, exclusive of the given\n * value.\n * @param value Maximum value\n *\n * @example\n * ```typespec\n * @maxValueExclusive(50)\n * scalar distance is float64;\n * ```\n */\nextern dec maxValueExclusive(target: numeric | ModelProperty, value: valueof numeric);\n\n/**\n * Mark this string as a secret value that should be treated carefully to avoid exposure\n *\n * @example\n * ```typespec\n * @secret\n * scalar Password is string;\n * ```\n */\nextern dec secret(target: string | ModelProperty);\n\n/**\n * Mark this operation as a `list` operation for resource types.\n * @deprecated Use the `listsResource` decorator in `@typespec/rest` instead.\n * @param listedType Optional type of the items in the list.\n */\nextern dec list(target: Operation, listedType?: Model);\n\n/**\n * Attaches a tag to an operation, interface, or namespace. Multiple `@tag` decorators can be specified to attach multiple tags to a TypeSpec element.\n * @param tag Tag value\n */\nextern dec tag(target: Namespace | Interface | Operation, tag: valueof string);\n\n/**\n * Specifies how a templated type should name their instances.\n * @param name name the template instance should take\n * @param formatArgs Model with key value used to interpolate the name\n *\n * @example\n * ```typespec\n * @friendlyName(\"{name}List\", T)\n * model List<T> {\n *   value: T[];\n *   nextLink: string;\n * }\n * ```\n */\nextern dec friendlyName(target: unknown, name: valueof string, formatArgs?: unknown);\n\n/**\n * Provide a set of known values to a string type.\n * @param values Known values enum.\n *\n * @example\n * ```typespec\n * @knownValues(KnownErrorCode)\n * scalar ErrorCode extends string;\n *\n * enum KnownErrorCode {\n *   NotFound,\n *   Invalid,\n * }\n * ```\n */\nextern dec knownValues(target: string | numeric | ModelProperty, values: Enum);\n\n/**\n * Mark a model property as the key to identify instances of that type\n * @param altName Name of the property. If not specified, the decorated property name is used.\n *\n * @example\n * ```typespec\n * model Pet {\n *   @key id: string;\n * }\n * ```\n */\nextern dec key(target: ModelProperty, altName?: valueof string);\n\n/**\n * Specify this operation is an overload of the given operation.\n * @param overloadbase Base operation that should be a union of all overloads\n *\n * @example\n * ```typespec\n * op upload(data: string | bytes, @header contentType: \"text/plain\" | \"application/octet-stream\"): void;\n * @overload(upload)\n * op uploadString(data: string, @header contentType: \"text/plain\" ): void;\n * @overload(upload)\n * op uploadBytes(data: bytes, @header contentType: \"application/octet-stream\"): void;\n * ```\n */\nextern dec overload(target: Operation, overloadbase: Operation);\n\n/**\n * Provide an alternative name for this type.\n * @param targetName Projection target\n * @param projectedName Alternative name\n *\n * @example\n * ```typespec\n * model Certificate {\n *   @projectedName(\"json\", \"exp\")\n *   expireAt: int32;\n * }\n * ```\n */\nextern dec projectedName(\n  target: unknown,\n  targetName: valueof string,\n  projectedName: valueof string\n);\n\n/**\n * Specify the property to be used to discriminate this type.\n * @param propertyName The property name to use for discrimination\n *\n * @example\n *\n * ```typespec\n * @discriminator(\"kind\")\n * union Pet{ cat: Cat, dog: Dog }\n *\n * model Cat {kind: \"cat\", meow: boolean}\n * model Dog {kind: \"dog\", bark: boolean}\n * ```\n *\n * ```typespec\n * @discriminator(\"kind\")\n * model Pet{ kind: string }\n *\n * model Cat extends Pet {kind: \"cat\", meow: boolean}\n * model Dog extends Pet  {kind: \"dog\", bark: boolean}\n * ```\n */\nextern dec discriminator(target: Model | Union, propertyName: valueof string);\n\n/**\n * Known encoding to use on utcDateTime or offsetDateTime\n */\nenum DateTimeKnownEncoding {\n  /**\n   * RFC 3339 standard. https://www.ietf.org/rfc/rfc3339.txt\n   * Encode to string.\n   */\n  rfc3339: \"rfc3339\",\n\n  /**\n   * RFC 7231 standard. https://www.ietf.org/rfc/rfc7231.txt\n   * Encode to string.\n   */\n  rfc7231: \"rfc7231\",\n\n  /**\n   * Encode to integer\n   */\n  unixTimestamp: \"unixTimestamp\",\n}\n\n/**\n * Known encoding to use on duration\n */\nenum DurationKnownEncoding {\n  /**\n   * ISO8601 duration\n   */\n  ISO8601: \"ISO8601\",\n\n  /**\n   * Encode to integer or float\n   */\n  seconds: \"seconds\",\n}\n\n/**\n * Known encoding to use on bytes\n */\nenum BytesKnownEncoding {\n  /**\n   * Encode to Base64\n   */\n  base64: \"base64\",\n\n  /**\n   * Encode to Base64 Url\n   */\n  base64url: \"base64url\",\n}\n\n/**\n * Specify how to encode the target type.\n * @param encoding Known name of an encoding.\n * @param encodedAs What target type is this being encoded as. Default to string.\n *\n * @example offsetDateTime encoded with rfc7231\n *\n * ```tsp\n * @encode(\"rfc7231\")\n * scalar myDateTime extends offsetDateTime;\n * ```\n *\n * @example utcDateTime encoded with unixTimestamp\n *\n * ```tsp\n * @encode(\"unixTimestamp\", int32)\n * scalar myDateTime extends unixTimestamp;\n * ```\n */\nextern dec encode(\n  target: Scalar | ModelProperty,\n  encoding: string | EnumMember,\n  encodedAs?: Scalar\n);\n\n/**\n * Indicates that a property is only considered to be present or applicable (\"visible\") with\n * the in the given named contexts (\"visibilities\"). When a property has no visibilities applied\n * to it, it is implicitly visible always.\n *\n * As far as the TypeSpec core library is concerned, visibilities are open-ended and can be arbitrary\n * strings, but  the following visibilities are well-known to standard libraries and should be used\n * with standard emitters that interpret them as follows:\n *\n * - \"read\": output of any operation.\n * - \"create\": input to operations that create an entity..\n * - \"query\": input to operations that read data.\n * - \"update\": input to operations that update data.\n * - \"delete\": input to operations that delete data.\n *\n * See also: [Automatic visibility](https://microsoft.github.io/typespec/libraries/http/operations#automatic-visibility)\n *\n * @param visibilities List of visibilities which apply to this property.\n *\n * @example\n *\n * ```typespec\n * model Dog {\n *   // the service will generate an ID, so you don't need to send it.\n *   @visibility(\"read\") id: int32;\n *   // the service will store this secret name, but won't ever return it\n *   @visibility(\"create\", \"update\") secretName: string;\n *   // the regular name is always present\n *   name: string;\n * }\n * ```\n */\nextern dec visibility(target: ModelProperty, ...visibilities: valueof string[]);\n\n/**\n * Removes properties that are not considered to be present or applicable\n * (\"visible\") in the given named contexts (\"visibilities\"). Can be used\n * together with spread to effectively spread only visible properties into\n * a new model.\n *\n * See also: [Automatic visibility](https://microsoft.github.io/typespec/libraries/http/operations#automatic-visibility)\n *\n * When using an emitter that applies visibility automatically, it is generally\n * not necessary to use this decorator.\n *\n * @param visibilities List of visibilities which apply to this property.\n *\n * @example\n * ```typespec\n * model Dog {\n *   @visibility(\"read\") id: int32;\n *   @visibility(\"create\", \"update\") secretName: string;\n *   name: string;\n * }\n *\n * // The spread operator will copy all the properties of Dog into DogRead,\n * // and @withVisibility will then remove those that are not visible with\n * // create or update visibility.\n * //\n * // In this case, the id property is removed, and the name and secretName\n * // properties are kept.\n * @withVisibility(\"create\", \"update\")\n * model DogCreateOrUpdate {\n *   ...Dog;\n * }\n *\n * // In this case the id and name properties are kept and the secretName property\n * // is removed.\n * @withVisibility(\"read\")\n * model DogRead {\n *   ...Dog;\n * }\n * ```\n */\nextern dec withVisibility(target: Model, ...visibilities: valueof string[]);\n\n/**\n * Set the visibility of key properties in a model if not already set.\n *\n * @param visibility The desired default visibility value. If a key property already has a `visibility` decorator then the default visibility is not applied.\n */\nextern dec withDefaultKeyVisibility(target: Model, visibility: valueof string);\n\n/**\n * Returns the model with non-updateable properties removed.\n */\nextern dec withUpdateableProperties(target: Model);\n\n/**\n * Returns the model with required properties removed.\n */\nextern dec withOptionalProperties(target: Model);\n\n/**\n * Returns the model with any default values removed.\n */\nextern dec withoutDefaultValues(target: Model);\n\n/**\n * Returns the model with the given properties omitted.\n * @param omit List of properties to omit\n */\nextern dec withoutOmittedProperties(target: Model, omit: string | Union);\n\n//---------------------------------------------------------------------------\n// Debugging\n//---------------------------------------------------------------------------\n\n/**\n * A debugging decorator used to inspect a type.\n * @param text Custom text to log\n */\nextern dec inspectType(target: unknown, text: valueof string);\n\n/**\n * A debugging decorator used to inspect a type name.\n * @param text Custom text to log\n */\nextern dec inspectTypeName(target: unknown, text: valueof string);\n\n/**\n * Sets which visibilities apply to parameters for the given operation.\n * @param visibilities List of visibility strings which apply to this operation.\n */\nextern dec parameterVisibility(target: Operation, ...visibilities: valueof string[]);\n\n/**\n * Sets which visibilities apply to the return type for the given operation.\n * @param visibilities List of visibility strings which apply to this operation.\n */\nextern dec returnTypeVisibility(target: Operation, ...visibilities: valueof string[]);\n",
  "lib/reflection.tsp": "namespace TypeSpec.Reflection;\n\nmodel Enum {}\nmodel EnumMember {}\nmodel Interface {}\nmodel Model {}\nmodel ModelProperty {}\nmodel Namespace {}\nmodel Operation {}\nmodel Scalar {}\nmodel Union {}\nmodel UnionVariant {}\nmodel StringTemplate {}\n",
  "lib/projected-names.tsp": "// Set of projections consuming the @projectedName decorator\n#suppress \"projections-are-experimental\"\nprojection op#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection interface#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection model#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection enum#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection union#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n"
};
const _TypeSpecLibrary_ = {
  jsSourceFiles: TypeSpecJSSources,
  typespecSourceFiles: TypeSpecSources,
};

export { CadlLanguageConfiguration, CadlPrettierPlugin, NodeHost, TypeSpecLanguageConfiguration, TypeSpecPrettierPlugin, _TypeSpecLibrary_, createProjectedNameProgram, interpolatePath, isTemplateDeclaration, isTemplateDeclarationOrInstance, listOperationsIn, projectProgram };
