import { BasicTestRunner } from "@typespec/compiler/testing";
import { compare, createPydanticTestRunner, pydanticOutputFor } from "./test-host.js";
import { ok } from "assert";

describe("Pydantic", () => {
    let runner: BasicTestRunner;

    beforeEach(async () => {
        runner = await createPydanticTestRunner();
    });

    it("supports simple schema", async () => {
        const input = `
        @test
        namespace WidgetManager;

        model Widget {
            name: string;
            price: float;
            action: boolean;
        }`;

        const expect = `
        class Widget(BaseModel):
            name: str
            price: float
            action: bool
        `;
        const result = await pydanticOutputFor(input);
        compare(expect, result, 3);
    });

    it("supports literals", async () => {
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
        const result = await pydanticOutputFor(input);
        compare(expect, result, 3);
    });

    it("supports arrays", async () => {
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
        const result = await pydanticOutputFor(input);
        compare(expect, result, 3);
    });

    it("supports tuples", async () => {
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
        const result = await pydanticOutputFor(input);
        compare(expect, result, 3);
    });

    it("supports class references", async () => {
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
        const result = await pydanticOutputFor(input);
        compare(expect, result, 3);
    });

    it("supports datetime", async () => {
        const input = `
        @test
        namespace WidgetManager;

        model Widget {
            created: utcDateTime;
        }
        `;
        const expect = `
        class Widget(BaseModel):
            created: datetime
        `;
        const result = await pydanticOutputFor(input);
        compare(expect, result, 3);
    });

    it("supports optionals", async () => {
        const input = `
        @test
        namespace WidgetManager;

        model Widget {
            name?: string;
        }
        `;
        const expect = `
        class Widget(BaseModel):
            name: str | None
        `;
        const result = await pydanticOutputFor(input);
        compare(expect, result, 3);
    });

    it("supports dict", async () => {
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
        const result = await pydanticOutputFor(input);
        compare(expect, result, 3);
    });

    it("supports unions", async () => {
        const input = `
        @test
        namespace WidgetManager;

        model Widget {
            color: "red" | "green" | "blue";
            count: 1 | 2 | 3;
            numbers: int16 | int32 | float;
        }
        `;
        const expect = `
        class Widget(BaseModel):
            color: Literal["red", "green", "blue"]
            count: Literal[1, 2, 3]
            numbers: Union[int, float]
        `;
        const result = await pydanticOutputFor(input);
        compare(expect, result, 3);
    });
});