import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { compare, pydanticOutputFor } from "./test-host.js";

describe("Pydantic", () => {
  const startLine = 6;

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

    it("supports documentation with @doc", async () => {
      const input = `
        @test
        namespace WidgetManager;

        @doc("This is a widget.")
        model Widget {
            @doc("The name of the widget.")
            name: string;
        }`;

      const expect = `
        class Widget(BaseModel):
            """This is a widget."""
            name: str = Field(description="The name of the widget.")
            """The name of the widget."""
        `;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result, startLine);
    });

    it("supports documentation with doc comment", async () => {
      const input = `
        @test
        namespace WidgetManager;

        /** This is a widget. */
        model Widget {
            /** The name of the widget. */
            name: string;
        }`;

      const expect = `
        class Widget(BaseModel):
            """This is a widget."""
            name: str = Field(description="The name of the widget.")
            """The name of the widget."""
        `;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result, startLine);
    });

    it("supports string constraints", async () => {
      const input = `
        @test
        namespace WidgetManager;

        model Widget {
          @minLength(1)
          @maxLength(10)
          @pattern("^[a-zA-Z_]*$")
          name: string;
        }`;

      const expect = `
        class Widget(BaseModel):
            name: str = Field(min_length=1, max_length=10, pattern="^[a-zA-Z_]*$")
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
        }`;

      const expect = `
        class Foo(BaseModel):
            _1: str`;
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
            name: str = Field(default="Widget")
            price: float = Field(default=9.99)
            num: int = Field(default=1)
            action: bool = Field(default=True)
        `;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result, startLine);
    });

    it("supports readonly values", async () => {
      const input = `
        model Widget {
            @visibility("read")
            name: string = "Widget";
        }`;

      const expect = `
        class Widget(BaseModel):
            name: str = Field(default="Widget", frozen=True)`;
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
        }`;

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
        }`;

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
            parts: WidgetParts`;
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
            parts: List[str]`;
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
            parts: Tuple[str, int, List[float]]`;
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
        }`;
      const expect = `
        class WidgetPart(BaseModel):
            name: str

        class Widget(BaseModel):
            part: WidgetPart
            parts: List[WidgetPart]`;
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
        }`;
      const expect = `
        class Widget(BaseModel):
            properties: Dict[str, str]`;
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
        }`;
      const expect = `
        class Widget(BaseModel):
            widget_part: object`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnostics(diagnostics, [
        {
          code: "typespec-pydantic/anonymous-model",
        },
      ]);
      compare(expect, result, startLine);
    });

    it("converts camelCase properties to snake_case", async () => {
      const input = `
        @test
        namespace WidgetManager;

        model Widget {
            someWeirdCasing: string;
        }`;
      const expect = `
        class Widget(BaseModel):
            some_weird_casing: str`;
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
        }`;
      const expect = `
        class Widget(BaseModel):
            name: Optional[str]`;
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

        model StringWidget is Widget<string>;`;
      const expect = `
        class StringWidget(BaseModel):
            contents: str`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result, startLine);
    });

    it("supports anonymous template instantiations", async () => {
      const input = `
        @test
        namespace WidgetManager;

        model Widget<T> {
            contents: T;
        }

        model WidgetPart {
            widget: Widget<string>;
        };`;
      const expect = `
        class WidgetPart(BaseModel):
            widget: "WidgetString"

        class WidgetString(BaseModel):
            contents: str`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
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
        };`;
      const expect = `
        class Widget(BaseModel):
            widget: Union[str]`;
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
        };`;
      const expect = `
        class Widget(BaseModel):
            name: str`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result, startLine);
    });

    it("supports discriminated unions", async () => {
      const input = `
        @discriminator("kind")
        model BaseShape {}
        
        model Circle extends BaseShape {
          kind: "Circle";
          radius: float32;
        }
        
        model Square extends BaseShape {
          kind: "Square";
          length: float32;
        }
        
        alias Shape = Circle | Square;
        
        model Foo {
          shape: Shape
        }`;
      const expect = `
        class BaseShape(BaseModel):
            pass

        class Circle(BaseModel):
            kind: Literal["Circle"]
            radius: float
      
        class Square(BaseModel):
            kind: Literal["Square"]
            length: float
            
        class Foo(BaseModel):
            shape: Union[Circle, Square] = Field(discriminator="kind")`;
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

        op getWidget(name: string): Widget;`;
      const expect = `
        class Widget(BaseModel):
            name: str`;
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
        }`;
      const expect = `
        class Widget(BaseModel):
            name: str`;
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
        }`;
      const expect = `
        class WidgetShape(BaseModel, Enum):
            CUBE = Field(default="cube", frozen=True)
            SPHERE = Field(default="sphere", frozen=True)
            PYRAMID = Field(default="pyramid", frozen=True)

        class WidgetColor(BaseModel, Enum):
            RED = Field(default="Red", frozen=True)
            GREEN = Field(default="Green", frozen=True)
            BLUE = Field(default="Blue", frozen=True)

        class Widget(BaseModel):
            shape: Optional[WidgetShape]
            color: Optional[WidgetColor]`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result, startLine);
    });

    it("supports documentation with @doc", async () => {
      const input = `
        @test
        namespace WidgetManager;

        @doc("This is a widget shape.")
        enum WidgetShape {
            @doc("This is a cube.")
            cube,
            @doc("This is a sphere.")
            sphere,
            @doc("This is a pyramid.")
            pyramid
        }`;

      const expect = `
        class WidgetShape(BaseModel, Enum):
            """This is a widget shape."""
            CUBE = Field(description="This is a cube.", default="cube", frozen=True)
            """This is a cube."""
            SPHERE = Field(description="This is a sphere.", default="sphere", frozen=True)
            """This is a sphere."""
            PYRAMID = Field(description="This is a pyramid.", default="pyramid", frozen=True)
            """This is a pyramid."""`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result, startLine);
    });

    it("supports documentation with doc comments", async () => {
      const input = `
        @test
        namespace WidgetManager;

        /** This is a widget shape. */
        enum WidgetShape {
            /** This is a cube. */
            cube,
            /** This is a sphere. */
            sphere,
            /** This is a pyramid. */
            pyramid
        }`;

      const expect = `
        class WidgetShape(BaseModel, Enum):
            """This is a widget shape."""
            CUBE = Field(description="This is a cube.", default="cube", frozen=True)
            """This is a cube."""
            SPHERE = Field(description="This is a sphere.", default="sphere", frozen=True)
            """This is a sphere."""
            PYRAMID = Field(description="This is a pyramid.", default="pyramid", frozen=True)
            """This is a pyramid."""`;
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
        }`;
      const expect = `
        class Widget(BaseModel):
            cube: Literal[WidgetShape.CUBE]
            circle: Literal[WidgetShape.CIRCLE]

        class WidgetShape(BaseModel, Enum):
            CUBE = Field(default="cube", frozen=True)
            CIRCLE = Field(default="Sphere", frozen=True)`;
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
        }`;
      const expect = `
        class Widget(BaseModel):
            color: Literal["red", "green", "blue"]
            count: Literal[1, 2, 3]
            numbers: Union[int, float]
            mixed: Optional[Union[Literal["moo"], int]]`;
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
        }`;

      const expect = `
        class Widget(BaseModel):
            type: Optional[Union[int, str, bool]]
            literal: Optional[Literal[1, "two", False]]
            named_reference: bool
            mixed: Union[Literal[1, 2, "void"], bool]`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result, startLine);
    });
  });

  describe("decorators", () => {
    describe("@field", () => {
      it("can be used multiple times", async () => {
        const input = `
          model Widget {
              @field("kw_only", true)
              @field("title", "The Widget of Oz")
              name: string;

              @field("max_digits", 5)
              @field("decimal_places", 2)
              cost: float;
          };`;
        const expect = `
          class Widget(BaseModel):
              name: str = Field(title="The Widget of Oz", kw_only=True)
              cost: float = Field(decimal_places=2, max_digits=5)`;
        const [result, diagnostics] = await pydanticOutputFor(input);
        expectDiagnosticEmpty(diagnostics);
        compare(expect, result, startLine);
      });
    });
  });
});
