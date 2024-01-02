import { BasicTestRunner, createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
import { createPydanticTestRunner } from "../test-host.js";
import { emptyUnionRule } from "../../src/rules/empty-union.js";

describe("typespec-pydantic: empty-union rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createPydanticTestRunner();
    tester = createLinterRuleTester(runner, emptyUnionRule, "typespec-pydantic");
  });

  it("emits `empty-union` for empty unions", async () => {
    await tester
      .expect(
        `
      union Widget {}`,
      )
      .toEmitDiagnostics([
        {
          code: "typespec-pydantic/empty-union",
        },
      ]);
    //         const expect = `
    //   class Widget(BaseModel):
    //       widget_part: object`;
    // const [result, diagnostics] = await pydanticOutputFor(input);
    // expectDiagnostics(diagnostics, [
    //   {
    //     code: "typespec-pydantic/anonymous-model",
    //   },
    // ]);
    // compare(expect, result);
  });
});
