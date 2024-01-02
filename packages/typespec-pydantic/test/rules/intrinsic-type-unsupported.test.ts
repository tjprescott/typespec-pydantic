import { BasicTestRunner, createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
import { createPydanticTestRunner } from "../test-host.js";
import { intrinsicTypeUnsupportedRule } from "../../src/rules/intrinsic-type-unsupported.js";

describe("typespec-pydantic: intrinsic-type-unsupported rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createPydanticTestRunner();
    tester = createLinterRuleTester(runner, intrinsicTypeUnsupportedRule, "typespec-pydantic");
  });

  it("emits `intrinsic-type-unsupported` for `never` types", async () => {
    await tester
      .expect(
        `model Foo {
            p1: never;
        }`,
      )
      .toEmitDiagnostics([
        {
          code: "typespec-pydantic/intrinsic-type-unsupported",
          message: "Intrinsic type 'never' not supported in Pydantic. Property will be omitted.",
        },
      ]);
  });
});
