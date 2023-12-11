import { BasicTestRunner, expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { compare, createPydanticTestRunner, pydanticOutputFor } from "./test-host.js";
import { ok } from "assert";

describe("Pydantic", () => {
    let runner: BasicTestRunner;
    let startLine = 6;

    beforeEach(async () => {
        runner = await createPydanticTestRunner();
    });

    describe("models", () => {
        it("supports simple properties", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                name: string;
                price: float;
                action: boolean;
                created: utcDateTime;
            }`;
    
            const expect = `
            class Widget(BaseModel):
                name: str
                price: float
                action: bool
                created: datetime
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("transforms names that start with reserved keywords", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Foo {
                in: string;
                def: string;
                class: string;
            }
            `;
    
            const expect = `
            class Foo(BaseModel):
                in_: str
                def_: str
                class_: str
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("transforms names that start with numbers", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Foo {
                "1": string;
            }
            `;
    
            const expect = `
            class Foo(BaseModel):
                _1: str
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports default values", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                name: string = "Widget";
                price: float = 9.99;
                num: int16 = 1;
                action: boolean = true;
            }`;
    
            const expect = `
            class Widget(BaseModel):
                name: str = "Widget"
                price: float = 9.99
                num: int = 1
                action: bool = True
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("support intrinsic types", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Foo {
                p1: never;
                p2: null;
                p3: unknown;
                p4: void;
            }
            `;
    
            const expect = `
            class Foo(BaseModel):
                p2: None
                p3: object
                p4: None
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnostics(diagnostics, {
                code: "typespec-pydantic/intrinsic-type-unsupported",
                message: "Intrinsic type 'never' not supported in Pydantic. Property will be omitted.",
            });
            compare(expect, result, startLine);
        });

        it("supports property references", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Foo {
                prop: string;
            }
            
            model Bar {
                prop: Foo.prop;
            }
            `;
    
            const expect = `
            class Foo(BaseModel):
                prop: str

            class Bar(BaseModel):
                prop: str
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports literal properties", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                name: "widget";
                price: 15.50;
                action: true;
            }`;
    
            const expect = `
            class Widget(BaseModel):
                name: Literal["widget"]
                price: Literal[15.5]
                action: Literal[True]
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports array properties", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                parts: string[];
            }`;
    
            const expect = `
            class Widget(BaseModel):
                parts: List[str]
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports array declaration as RootModel", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model WidgetParts is string[];

            model Widget {
                parts: WidgetParts;
            }`;
    
            const expect = `
            class WidgetParts(RootModel):
                root: List[str]

                def __iter__(self):
                    return iter(self.root)

                def __getitem__(self, item):
                    return self.root[item]

            class Widget(BaseModel):
                parts: WidgetParts
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports array declaration aliases", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            alias WidgetParts = string[];

            model Widget {
                parts: WidgetParts;
            }`;
    
            const expect = `
            class Widget(BaseModel):
                parts: List[str]
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports tuple properties", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                parts: [string, int16, float[]];
            }`;
    
            const expect = `
            class Widget(BaseModel):
                parts: Tuple[str, int, List[float]]
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports class reference properties", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                part: WidgetPart;
                parts: WidgetPart[];
            }
            
            model WidgetPart {
                name: string;
            }
            `;
            const expect = `
            class WidgetPart(BaseModel):
                name: str
    
            class Widget(BaseModel):
                part: WidgetPart
                parts: List[WidgetPart]
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports dict properties", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                properties: Record<string>;
            }
            `;
            const expect = `
            class Widget(BaseModel):
                properties: Dict[str, str]
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("emits warning and object for anonymous model properties", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                widgetPart: {
                    name: string;
                }
            }
            `;
            const expect = `
            class Widget(BaseModel):
                widget_part: object
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnostics(diagnostics, [{
                code: "typespec-pydantic/anonymous-model",
            }]);
            compare(expect, result, startLine);
        });

        it("converts camelCase properties to snake_case", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                someWeirdCasing: string;
            }
            `;
            const expect = `
            class Widget(BaseModel):
                some_weird_casing: str
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports optional properties", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                name?: string;
            }
            `;
            const expect = `
            class Widget(BaseModel):
                name: Optional[str]
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports named template instantiations", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget<T> {
                contents: T;
            }
    
            model StringWidget is Widget<string>;
            `;
            const expect = `
            class StringWidget(BaseModel):
                contents: str
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("emits warning for unnamed template instantiations", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget<T> {
                contents: T;
            }
    
            model WidgetPart {
                widget: Widget<string>;
            };
            `;
            const expect = `
            class WidgetPart(BaseModel):
                widget: Widget
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnostics(diagnostics, [{
                code: "typespec-pydantic/template-instantiation",
            }]);
            compare(expect, result, startLine);
        });

        it("supports union instantiations", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            union SomeUnion<T> {
                T
            }
    
            model Widget {
                widget: SomeUnion<string>;
            };
            `;
            const expect = `
            class Widget(BaseModel):
                widget: Union[str]
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports scalar instantiations", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            scalar MyString<T> extends string;
    
            model Widget {
                name: MyString<string>;
            };
            `;
            const expect = `
            class Widget(BaseModel):
                name: str
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });
    });


    describe("operations", () => {
        it("ignores operations", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                name: string
            }
    
            op getWidget(name: string): Widget;
            `;
            const expect = `
            class Widget(BaseModel):
                name: str
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });    
    });

    describe("interfaces", () => {
        it("ignores interfaces", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                name: string
            }
    
            interface WidgetOperations {
                getWidget(name: string): Widget;
            }
            `;
            const expect = `
            class Widget(BaseModel):
                name: str
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });    
    });

    describe("enums", () => {
        it("supports enum declarations", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            enum WidgetShape {
                cube,
                sphere,
                pyramid
            }

            enum WidgetColor {
                red: "Red",
                green: "Green",
                blue: "Blue",
            }

            model Widget {
                shape?: WidgetShape;
                color?: WidgetColor;
            }
            `;
            const expect = `
            class WidgetShape(Enum):
                CUBE = "cube"
                SPHERE = "sphere"
                PYRAMID = "pyramid"

            class WidgetColor(Enum):
                RED = "Red"
                GREEN = "Green"
                BLUE = "Blue"

            class Widget(BaseModel):
                shape: Optional[WidgetShape]
                color: Optional[WidgetColor]
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports enum member references", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            enum WidgetShape {
                cube,
                circle: "Sphere",
            }

            model Widget {
                cube: WidgetShape.cube;
                circle: WidgetShape.circle;
            }
            `;
            const expect = `
            class Widget(BaseModel):
                cube: Literal[WidgetShape.CUBE]
                circle: Literal[WidgetShape.CIRCLE]

            class WidgetShape(Enum):
                CUBE = "cube"
                CIRCLE = "Sphere"
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });
    });
 
    describe("unions", () => {
        it("supports union literals as properties", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            model Widget {
                color: "red" | "green" | "blue";
                count: 1 | 2 | 3;
                numbers: int16 | int32 | float;
                mixed?: "moo" | int16;
            }
            `;
            const expect = `
            class Widget(BaseModel):
                color: Literal["red", "green", "blue"]
                count: Literal[1, 2, 3]
                numbers: Union[int, float]
                mixed: Optional[Union[Literal["moo"], int]]
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });

        it("supports union declarations as properties", async () => {
            const input = `
            @test
            namespace WidgetManager;
    
            union UnionOfTypes {
                integer: int16,
                string,
                bool: boolean,
            }

            union UnionOfLiterals {
                1,
                "two",
                false,
            }

            union MixedUnion {
                1,
                2,
                "void",
                boolean,
            }

            model Widget {
                type?: UnionOfTypes;
                literal?: UnionOfLiterals;
                namedReference: UnionOfTypes.bool;
                mixed: MixedUnion;
            }
            `;
    
            const expect = `
            class Widget(BaseModel):
                type: Optional[Union[int, str, bool]]
                literal: Optional[Literal[1, "two", False]]
                named_reference: bool
                mixed: Union[Literal[1, 2, "void"], bool]
            `;
            const [result, diagnostics] = await pydanticOutputFor(input);
            expectDiagnosticEmpty(diagnostics);
            compare(expect, result, startLine);
        });
    });
});