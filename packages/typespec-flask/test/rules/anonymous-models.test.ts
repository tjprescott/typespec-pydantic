// import { BasicTestRunner, createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
// import { createPydanticTestRunner } from "../test-host.js";
// import { anonymousModelRule } from "../../src/rules/anonymous-model.js";

// describe("typespec-pydantic: anonymous-model rule", () => {
//   let runner: BasicTestRunner;
//   let tester: LinterRuleTester;

//   beforeEach(async () => {
//     runner = await createPydanticTestRunner();
//     tester = createLinterRuleTester(runner, anonymousModelRule, "typespec-pydantic");
//   });

//   it("emits `anonymous-model` and `object` for anonymous model properties", async () => {
//     await tester
//       .expect(
//         `
//       model Widget {
//           widgetPart: {
//               name: string;
//           }
//       }`,
//       )
//       .toEmitDiagnostics([
//         {
//           code: "typespec-pydantic/anonymous-model",
//         },
//       ]);
//     //         const expect = `
//     //   class Widget(BaseModel):
//     //       widget_part: object`;
//     // const [result, diagnostics] = await pydanticOutputFor(input);
//     // expectDiagnostics(diagnostics, [
//     //   {
//     //     code: "typespec-pydantic/anonymous-model",
//     //   },
//     // ]);
//     // compare(expect, result);
//   });
// });
