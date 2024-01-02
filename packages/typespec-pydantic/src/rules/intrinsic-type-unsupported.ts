import { createRule } from "@typespec/compiler";

export const intrinsicTypeUnsupportedRule = createRule({
  name: "intrinsic-type-unsupported",
  description: "Certain intrinsic types are not supported in typespec-pydantic.",
  severity: "warning",
  messages: {
    default: "Intrinsic type 'never' not supported in Pydantic. Property will be omitted.",
  },
  create(context) {
    return {
      modelProperty: (property) => {
        if (property.type.kind === "Intrinsic") {
          if (property.type.name === "never") {
            context.reportDiagnostic({
              target: property,
            });
          }
        }
      },
    };
  },
});
