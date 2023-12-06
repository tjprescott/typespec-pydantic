import { BasicTestRunner } from "@typespec/compiler/testing";
import { compare, createPydanticTestRunner, pydanticOutputFor } from "./test-host.js";
import { ok } from "assert";

describe("Pydantic", () => {
    let runner: BasicTestRunner;

    beforeEach(async () => {
        runner = await createPydanticTestRunner();
    });

    it("suppoprts simple schema", async () => {
        const input = `
        @test
        namespace WidgetManager;

        model Widget {
            name: string;
            price: float;
        }`;

        const expect = `
        class Widget(BaseModel):
            name: str
            price: float
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
            parts: [string, int16];
        }`;

        const expect = `
        class Widget(BaseModel):
            parts: Tuple[str, int]
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
});