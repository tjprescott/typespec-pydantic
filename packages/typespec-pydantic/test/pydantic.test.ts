import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { compare, pydanticOutputFor } from "./test-host.js";

describe("Pydantic", () => {
  describe("models", () => {
    it("supports simple properties", async () => {
      const input = `
        model Widget {
            name: string;
            price: float;
            action: boolean;
            created: utcDateTime;
            file: bytes;
        }`;

      const expect = `
        class Widget(BaseModel):
            name: str
            price: float
            action: bool
            created: datetime
            file: bytes
        `;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports documentation with @doc", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("supports documentation with doc comment", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("supports string constraints", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("transforms names that start with reserved keywords", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("transforms names that start with numbers", async () => {
      const input = `
        model Foo {
            "1": string;
        }`;

      const expect = `
        class Foo(BaseModel):
            _1: str`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports default values", async () => {
      const input = `
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
      compare(expect, result);
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
      compare(expect, result);
    });

    it("support intrinsic types", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("supports property references", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("supports literal properties", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("supports array properties", async () => {
      const input = `
        model Widget {
            parts: string[];
        }`;

      const expect = `
        class Widget(BaseModel):
            parts: List[str]
        `;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports array declaration as RootModel", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("supports array declaration aliases", async () => {
      const input = `
        alias WidgetParts = string[];

        model Widget {
            parts: WidgetParts;
        }`;

      const expect = `
        class Widget(BaseModel):
            parts: List[str]`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports tuple properties", async () => {
      const input = `
        model Widget {
            parts: [string, int16, float[]];
        }`;

      const expect = `
        class Widget(BaseModel):
            parts: Tuple[str, int, List[float]]`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports class reference properties", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("supports dict properties", async () => {
      const input = `
        model Widget {
            properties: Record<string>;
        }`;
      const expect = `
        class Widget(BaseModel):
            properties: Dict[str, str]`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("emits warning and object for anonymous model properties", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("converts camelCase properties to snake_case", async () => {
      const input = `
        model Widget {
            someWeirdCasing: string;
        }`;
      const expect = `
        class Widget(BaseModel):
            some_weird_casing: str`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports optional properties", async () => {
      const input = `
        model Widget {
            name?: string;
        }`;
      const expect = `
        class Widget(BaseModel):
            name: Optional[str] = Field(default=None)`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports named template instantiations", async () => {
      const input = `
        model Widget<T> {
            contents: T;
        }

        model StringWidget is Widget<string>;`;
      const expect = `
        class StringWidget(BaseModel):
            contents: str`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports anonymous template instantiations", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("supports union instantiations", async () => {
      const input = `
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
      compare(expect, result);
    });

    it("supports discriminated unions", async () => {
      const input = `
        @discriminator("kind")
        union Shape {
          Circle,
          Square,
        }
        
        model Circle {
          kind: "Circle";
          radius: float32;
        }
        
        model Square {
          kind: "Square";
          length: float32;
        }
        
        model Foo {
          shape: Shape
        }`;
      const expect = `
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
      compare(expect, result);
    });

    it("supports extends relationship", async () => {
      const input = `
        @discriminator("kind")
        model Shape {}
        
        model Circle extends Shape {
          kind: "Circle";
          radius: float32;
        }
        
        model Square extends Shape {
          kind: "Square";
          length: float32;
        }
        
        model Foo {
          shape: Shape
        }`;
      const expect = `
        class Shape(BaseModel):
            pass

        class Circle(Shape):
            kind: Literal["Circle"]
            radius: float
      
        class Square(Shape):
            kind: Literal["Square"]
            length: float
            
        class Foo(BaseModel):
            shape: Shape = Field(discriminator="kind")`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });
  });

  describe("operations", () => {
    it("ignores operations", async () => {
      const input = `
        model Widget {
            name: string
        }

        op getWidget(name: string): Widget;`;
      const expect = `
        class Widget(BaseModel):
            name: str`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });
  });

  describe("interfaces", () => {
    it("ignores interfaces", async () => {
      const input = `
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
      compare(expect, result);
    });
  });

  describe("enums", () => {
    it("supports enum declarations", async () => {
      const input = `
        enum WidgetShape {
            Cube,
            Sphere,
            Pyramid
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
        class WidgetShape(BaseModel):
            CUBE = Field(default="Cube", frozen=True)
            SPHERE = Field(default="Sphere", frozen=True)
            PYRAMID = Field(default="Pyramid", frozen=True)

        class WidgetColor(BaseModel):
            RED = Field(default="Red", frozen=True)
            GREEN = Field(default="Green", frozen=True)
            BLUE = Field(default="Blue", frozen=True)

        class Widget(BaseModel):
            shape: Optional[WidgetShape] = Field(default=None)
            color: Optional[WidgetColor] = Field(default=None)`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports documentation with @doc", async () => {
      const input = `
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
        class WidgetShape(BaseModel):
            """This is a widget shape."""
            CUBE = Field(description="This is a cube.", default="cube", frozen=True)
            """This is a cube."""
            SPHERE = Field(description="This is a sphere.", default="sphere", frozen=True)
            """This is a sphere."""
            PYRAMID = Field(description="This is a pyramid.", default="pyramid", frozen=True)
            """This is a pyramid."""`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports documentation with doc comments", async () => {
      const input = `
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
        class WidgetShape(BaseModel):
            """This is a widget shape."""
            CUBE = Field(description="This is a cube.", default="cube", frozen=True)
            """This is a cube."""
            SPHERE = Field(description="This is a sphere.", default="sphere", frozen=True)
            """This is a sphere."""
            PYRAMID = Field(description="This is a pyramid.", default="pyramid", frozen=True)
            """This is a pyramid."""`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports enum member references", async () => {
      const input = `
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

        class WidgetShape(BaseModel):
            CUBE = Field(default="cube", frozen=True)
            CIRCLE = Field(default="Sphere", frozen=True)`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });
  });

  describe("unions", () => {
    it("supports union literals as properties", async () => {
      const input = `
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
            mixed: Optional[Union[Literal["moo"], int]] = Field(default=None)`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports union declarations as properties", async () => {
      const input = `
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
            type: Optional[Union[int, str, bool]] = Field(default=None)
            literal: Optional[Literal[1, "two", False]] = Field(default=None)
            named_reference: bool
            mixed: Union[Literal[1, 2, "void"], bool]`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });
  });

  describe("scalars", () => {
    it("supports scalar instantiations", async () => {
      const input = `
        scalar myString<T> extends string;

        model Widget {
            name: myString<string>;
        };`;
      const expect = `
        class Widget(BaseModel):
            name: "MyStringString"
            
        MyStringString = Annotated[str, Field()]`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports scalar declarations", async () => {
      const input = `
        @doc("My custom string")
        @minLength(1)
        scalar my_string extends string;

        model Widget {
            name: my_string;
        }`;
      const expect = `
        MyString = Annotated[str, Field(description="My custom string", min_length=1)]
 
        class Widget(BaseModel):
            name: MyString`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("translates TypeSpec scalars to Python types", async () => {
      const input = `
        model Widget {
            name: string;
            price: float;
            num: int16;
            action: boolean;
            date: plainDate;
            time: plainTime;
            dateTime: utcDateTime;
        }`;
      const expect = `
        class Widget(BaseModel):
            name: str
            price: float
            num: int
            action: bool
            date: date
            time: time
            date_time: datetime`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("avoids collisions with reserved Python names", async () => {
      const input = `
        model Widget {
            id: id;
        }
        
        @format("uuid")
        scalar id extends string;`;
      const expect = `
        Id = Annotated[str, Field()]

        class Widget(BaseModel):
            id: Id`;
      const [result, diagnostics] = await pydanticOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
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
        compare(expect, result);
      });
    });
  });
});
