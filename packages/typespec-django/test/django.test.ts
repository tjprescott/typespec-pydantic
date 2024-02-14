import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { djangoOutputFor } from "./test-host.js";
import { strictEqual } from "assert";
import { checkImports, compare } from "typespec-python/testing";

describe("typespec-django: core", () => {
  describe("namespaces", () => {
    it("namespaces as packages: all circular", async () => {
      const input = `
      @service
      namespace A {
        model ModelA {
          name: string;
          b?: B.ModelB;
          c?: B.C.ModelC[];
        }

        namespace B {
          model ModelB {
            name: string;
            a?: ModelA;
            c?: C.ModelC[];
          }

          namespace C {
            model ModelC {
              name: string;
              a?: ModelA;
              b?: ModelB[];
            }
          }
        }
      }
      `;
      const aInitExpect = `
      from a.models import ModelA

      __all__ = ["ModelA"]
      `;
      const aModelExpect = `
      from pydantic import models.Model, Field
      from a.b import ModelB
      from typing import Optional, List, TYPE_CHECKING

      if TYPE_CHECKING:
          from a.b.c import ModelC

      class ModelA(models.Model):
          name: str

          b: Optional[ModelB] = Field(default=None)

          c: Optional[List["ModelC"]] = Field(default=None)
      `;
      const bInitExpect = `
      from a.b.models import ModelB

      __all__ = ["ModelB"]
      `;
      const bModelExpect = `
      from pydantic import models.Model, Field
      from typing import Optional, List, TYPE_CHECKING

      if TYPE_CHECKING:
          from a import ModelA
          from a.b.c import ModelC

      class ModelB(models.Model):
          name: str

          a: Optional["ModelA"] = Field(default=None)

          c: Optional[List["ModelC"]] = Field(default=None)
      `;
      const cInitExpect = `
      from a.b.c.models import ModelC

      __all__ = ["ModelC"]
      `;
      const cModelExpect = `
      from pydantic import models.Model, Field
      from a import ModelA
      from typing import List, Optional
      from a.b import ModelB

      class ModelC(models.Model):
          name: str

          a: Optional[ModelA] = Field(default=None)

          b: Optional[List[ModelB]] = Field(default=None)
      `;
      const [results, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(results.length, 6);
      compare(aModelExpect, results[0].contents, false);
      compare(bModelExpect, results[1].contents, false);
      compare(cModelExpect, results[2].contents, false);
      compare(cInitExpect, results[3].contents, false);
      compare(bInitExpect, results[4].contents, false);
      compare(aInitExpect, results[5].contents, false);
    });

    it("namespaces as packages: loop", async () => {
      const input = `
      @service
      namespace A {
        model ModelA {
          b: B.ModelB;
        }

        namespace B {
          model ModelB {
            c: C.ModelC;
          }

          namespace C {
            model ModelC {
              a: ModelA;
            }
          }
        }
      }
      `;
      const aInitExpect = `
      from a.models import ModelA

      __all__ = ["ModelA"]
      `;
      const aModelExpect = `
      from pydantic import models.Model
      from a.b import ModelB

      class ModelA(models.Model):
          b: ModelB
      `;
      const bInitExpect = `
      from a.b.models import ModelB

      __all__ = ["ModelB"]
      `;
      const bModelExpect = `
      from pydantic import models.Model
      from typing import TYPE_CHECKING

      if TYPE_CHECKING:
          from a.b.c import ModelC

      class ModelB(models.Model):
          c: "ModelC"
      `;
      const cInitExpect = `
      from a.b.c.models import ModelC

      __all__ = ["ModelC"]
      `;
      const cModelExpect = `
      from pydantic import models.Model
      from a import ModelA

      class ModelC(models.Model):
          a: ModelA
      `;
      const [results, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(results.length, 6);
      compare(aModelExpect, results[0].contents, false);
      compare(bModelExpect, results[1].contents, false);
      compare(cModelExpect, results[2].contents, false);
      compare(cInitExpect, results[3].contents, false);
      compare(bInitExpect, results[4].contents, false);
      compare(aInitExpect, results[5].contents, false);
    });

    it("namespaces as packages: lollipop", async () => {
      const input = `
      @service
      namespace A {
        model ModelA {
          b: B.ModelB;
        }
        namespace B {
          model ModelB {
            c: C.ModelC;
          }
          namespace C {
            model ModelC {
              b: ModelB;
            }
          }
        }
      }
      `;
      const aModelExpect = `
      from pydantic import models.Model
      from a.b import ModelB

      class ModelA(models.Model):
          b: ModelB
      `;
      const bModelExpect = `
      from pydantic import models.Model
      from typing import TYPE_CHECKING

      if TYPE_CHECKING:
          from a.b.c import ModelC

      class ModelB(models.Model):
          c: "ModelC"
      `;
      const cModelExpect = `
      from pydantic import models.Model
      from a.b import ModelB

      class ModelC(models.Model):
          b: ModelB
      `;
      const [results, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(results.length, 6);
      compare(aModelExpect, results[0].contents, false);
      compare(bModelExpect, results[1].contents, false);
      compare(cModelExpect, results[2].contents, false);
    });

    it("supports anonymous template instantiations", async () => {
      const input = `
        @service
        namespace Widgets {
          model Widget<T> {
            contents: T;
          }

          model IntWidget is Widget<int32>;
          
          namespace Parts {
            model WidgetPart {
              widget: Widget<string>;
            };  
          }
        }`;
      const widgetsExpect = `
        from pydantic import models.Model

        class WidgetString(models.Model):
            contents: str

        class IntWidget(models.Model):
            contents: int`;
      const partsExpect = `
        from pydantic import models.Model
        from widgets import WidgetString

        class WidgetPart(models.Model):
            widget: WidgetString
        `;
      const widgetInitExpect = `
        from widgets.models import WidgetString, IntWidget
        
        __all__ = ["WidgetString", "IntWidget"]`;
      const partsInitExpect = `
        from widgets.parts.models import WidgetPart
        
        __all__ = ["WidgetPart"]`;
      const [results, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(results.length, 4);
      compare(widgetsExpect, results[0].contents, false);
      compare(partsExpect, results[1].contents, false);
      compare(partsInitExpect, results[2].contents, false);
      compare(widgetInitExpect, results[3].contents, false);
    });
  });

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
        from django.db import models
        from datetime import datetime

        class Widget(models.Model):
            name = models.CharField()
            price = models.FloatField()
            action = models.BooleanField()
            created = models.DateTimeField()
            file = models.BinaryField()`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents, false);
    });

    it("supports @knownValues", async () => {
      const input = `
        enum WidgetShape {
            square,
            circle,
        }

        model Widget {
          @knownValues(WidgetShape)
          shape: string;
        }`;
      const expect = `
        class Widget(models.Model):
            shape = models.CharField(choices=WidgetShape.choices)

        class WidgetShape(models.TextChoices):
            SQUARE = "SQUARE", _("square")
            CIRCLE = "CIRCLE", _("circle")`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports documentation with @doc", async () => {
      const input = `
        @doc("This is a widget.")
        model Widget {
            @doc("The name of the widget.")
            name: string;
        }`;

      const expect = `
        class Widget(models.Model):
            """This is a widget."""
            name = models.CharField(help_text="The name of the widget.")
            """The name of the widget."""
        `;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports documentation with doc comment", async () => {
      const input = `
        /**
         * This is a widget.
         * 
         * It is so amazing and wonderful... and a widget.
         */
        model Widget {
            /** 
             * The name of the widget.
             * 
             * It can really be any name you want. Really.
             */
            name: string;
        }`;

      const expect = `
        class Widget(models.Model):
            """
            This is a widget.
            
            It is so amazing and wonderful... and a widget.
            """
            name = models.CharField(help_text="The name of the widget.\\n\\nIt can really be any name you want. Really.")
            """
            The name of the widget.
            
            It can really be any name you want. Really.
            """
        `;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports string constraints", async () => {
      const input = `
        model Widget {
          @maxLength(10)
          name: string;
        }`;

      const expect = `
        class Widget(models.Model):
            name = models.CharField(max_length=10)
        `;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class Foo(models.Model):
            in_ = models.CharField()
            def_ = models.CharField()
            class_ = models.CharField()
        `;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("transforms names that start with numbers", async () => {
      const input = `
        model Foo {
            "1": string;
        }`;

      const expect = `
        class Foo(models.Model):
            _1 = models.CharField()`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class Widget(models.Model):
            name = models.CharField(default="Widget")
            price = models.FloatField(default=9.99)
            num = models.IntegerField(default=1)
            action = models.BooleanField(default=True)
        `;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports readonly values", async () => {
      const input = `
        model Widget {
            @visibility("read")
            name: string = "Widget";
        }`;

      const expect = `
        class Widget(models.Model):
            name = models.CharField(default="Widget", editable=False)`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class Foo(models.Model):
            p2: None
            p3: object
            p4: None
        `;
      const [result, _] = await djangoOutputFor(input);
      compare(expect, result[0].contents);
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
        class Foo(models.Model):
            prop = models.CharField()

        class Bar(models.Model):
            prop = models.CharField()`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports literal properties", async () => {
      const input = `
        model Widget {
            name: "widget";
            price: 15.50;
            action: true;
        }`;

      const expect = `
        class Widget(models.Model):
            name: Literal["widget"]
            price: Literal[15.5]
            action: Literal[True]
        `;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports array properties", async () => {
      const input = `
        model Widget {
            parts: string[];
        }`;

      const expect = `
        from django.db import models
        from typing import List

        class Widget(models.Model):
            parts: List[str]
        `;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents, false);
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

        class Widget(models.Model):
            parts: WidgetParts`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports array declaration aliases", async () => {
      const input = `
        alias WidgetParts = string[];

        model Widget {
            parts: WidgetParts;
        }`;

      const expect = `
        class Widget(models.Model):
            parts: List[str]`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports tuple properties", async () => {
      const input = `
        model Widget {
            parts: [string, int16, float[]];
        }`;

      const expect = `
        class Widget(models.Model):
            parts: Tuple[str, int, List[float]]`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class WidgetPart(models.Model):
            name: str

        class Widget(models.Model):
            part: WidgetPart
            parts: List[WidgetPart]`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports circular class reference properties", async () => {
      const input = `
        model ModelA {
          b: ModelB;
        }
        
        model ModelB {
            a: ModelA;
        }`;
      const expect = `
        class ModelB(models.Model):
            a: "ModelA"

        class ModelA(models.Model):
            b: ModelB`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports dict properties", async () => {
      const input = `
        model Widget {
            properties: Record<string>;
        }`;
      const expect = `
        class Widget(models.Model):
            properties: Dict[str, str]`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("emits `object` for anonymous model properties", async () => {
      const input = `
        model Widget {
            widgetPart: {
                name: string;
            }
        }`;
      const expect = `
        class Widget(models.Model):
            widget_part: object`;
      const [result, _] = await djangoOutputFor(input);
      compare(expect, result[0].contents);
    });

    it("converts camelCase properties to snake_case", async () => {
      const input = `
        model Widget {
            someWeirdCasing: string;
        }`;
      const expect = `
        class Widget(models.Model):
            some_weird_casing: str`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports optional properties", async () => {
      const input = `
        model Widget {
            name?: string;
        }`;
      const expect = `
        class Widget(models.Model):
            name: Optional[str] = Field(default=None)`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports named template instantiations", async () => {
      const input = `
        model Widget<T> {
            contents: T;
        }

        model StringWidget is Widget<string>;

        model IntWidget is Widget<int32>;`;
      const expect = `
        class StringWidget(models.Model):
            contents: str
            
        class IntWidget(models.Model):
            contents: int`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports anonymous template instantiations", async () => {
      const input = `
        model Widget<T> {
            contents: T;
        }

        model WidgetPart {
            widget: Widget<string>;
        }
        
        model Foo {
          widget: Widget<string>;
        }`;
      const expect = `
      class WidgetString(models.Model):
          contents: str

      class WidgetPart(models.Model):
          widget: WidgetString

      class Foo(models.Model):
          widget: WidgetString`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class Widget(models.Model):
            widget: Union[str]`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class Circle(models.Model):
            kind: Literal["Circle"]
            radius: float
      
        class Square(models.Model):
            kind: Literal["Square"]
            length: float
            
        class Foo(models.Model):
            shape: Union[Circle, Square] = Field(discriminator="kind")`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class Shape(models.Model):
            pass

        class Circle(Shape):
            kind: Literal["Circle"]
            radius: float
      
        class Square(Shape):
            kind: Literal["Square"]
            length: float
            
        class Foo(models.Model):
            shape: Shape = Field(discriminator="kind")`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class Widget(models.Model):
            name: str`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class Widget(models.Model):
            name: str`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class WidgetShape(Enum):
            CUBE = Field(default="Cube", frozen=True)
            SPHERE = Field(default="Sphere", frozen=True)
            PYRAMID = Field(default="Pyramid", frozen=True)

        class WidgetColor(Enum):
            RED = Field(default="Red", frozen=True)
            GREEN = Field(default="Green", frozen=True)
            BLUE = Field(default="Blue", frozen=True)

        class Widget(models.Model):
            shape: Optional[WidgetShape] = Field(default=None)
            color: Optional[WidgetColor] = Field(default=None)`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class WidgetShape(Enum):
            """This is a widget shape."""
            CUBE = Field(description="This is a cube.", default="cube", frozen=True)
            """This is a cube."""
            SPHERE = Field(description="This is a sphere.", default="sphere", frozen=True)
            """This is a sphere."""
            PYRAMID = Field(description="This is a pyramid.", default="pyramid", frozen=True)
            """This is a pyramid."""`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class WidgetShape(Enum):
            """This is a widget shape."""
            CUBE = Field(description="This is a cube.", default="cube", frozen=True)
            """This is a cube."""
            SPHERE = Field(description="This is a sphere.", default="sphere", frozen=True)
            """This is a sphere."""
            PYRAMID = Field(description="This is a pyramid.", default="pyramid", frozen=True)
            """This is a pyramid."""`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class Widget(models.Model):
            cube: Literal[WidgetShape.CUBE]
            circle: Literal[WidgetShape.CIRCLE]

        class WidgetShape(Enum):
            CUBE = Field(default="cube", frozen=True)
            CIRCLE = Field(default="Sphere", frozen=True)`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class Widget(models.Model):
            color: Literal["red", "green", "blue"]
            count: Literal[1, 2, 3]
            numbers: Union[int, float]
            mixed: Optional[Union[Literal["moo"], int]] = Field(default=None)`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
        class Widget(models.Model):
            type: Optional[Union[int, str, bool]] = Field(default=None)
            literal: Optional[Literal[1, "two", False]] = Field(default=None)
            named_reference: bool
            mixed: Union[Literal[1, 2, "void"], bool]`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });
  });

  describe("scalars", () => {
    it("supports scalar instantiations", async () => {
      const input = `
        scalar myString<T> extends string;

        model Widget {
            name: myString<string>;
        }
        
        model Foo {
          name: myString<string>;
        }`;
      const expect = `
        MyStringString = Annotated[str, Field()]

        class Widget(models.Model):
            name: MyStringString

        class Foo(models.Model):
            name: MyStringString`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports scalar declarations", async () => {
      const input = `
        @doc("My custom string")
        @minLength(1)
        scalar my_string extends string;

        model Widget {
            name: my_string;
        }`;
      const contentExpect = `
        MyString = Annotated[str, Field(description="My custom string", min_length=1)]
 
        class Widget(models.Model):
            name: MyString`;
      const initExpect = `
        from models import MyString, Widget

        __all__ = ["MyString", "Widget"]`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(contentExpect, result[0].contents);
      compare(initExpect, result[1].contents, false);
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
        class Widget(models.Model):
            name: str
            price: float
            num: int
            action: bool
            date: date
            time: time
            date_time: datetime`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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

        class Widget(models.Model):
            id: Id`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
    });

    it("supports @knownValues", async () => {
      const input = `
        enum WidgetShape {
            square,
            circle,
        }

        @knownValues(WidgetShape)
        scalar WidgetShapes extends string;

        model Widget {
          shape: WidgetShapes;
        }`;
      const expect = `
        WidgetShapes = Annotated[Union[str, WidgetShape], Field()]

        class Widget(models.Model):
            shape: WidgetShapes

        class WidgetShape(Enum):
            SQUARE = Field(default="square", frozen=True)
            CIRCLE = Field(default="circle", frozen=True)`;
      const [result, diagnostics] = await djangoOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result[0].contents);
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
          class Widget(models.Model):
              name: str = Field(title="The Widget of Oz", kw_only=True)
              cost: float = Field(decimal_places=2, max_digits=5)`;
        const [result, diagnostics] = await djangoOutputFor(input);
        expectDiagnosticEmpty(diagnostics);
        compare(expect, result[0].contents);
      });
    });
  });
});
