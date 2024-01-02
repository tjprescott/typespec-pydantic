import { Union, createRule } from "@typespec/compiler";

export const emptyUnionRule = createRule({
  name: "empty-union",
  description: "Empty Unions are not supported by typespec-pydantic.",
  severity: "warning",
  messages: {
    default: "Unions must have at least one variant.",
  },
  create(context) {
    return {
      union: (union: Union) => {
        if ([...union.variants.values()].length === 0) {
          context.reportDiagnostic({
            target: union,
          });
        }
      },
    };
  },
});
