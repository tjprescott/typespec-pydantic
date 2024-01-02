import { Model, createRule } from "@typespec/compiler";

export const anonymousModelRule = createRule({
  name: "anonymous-model",
  description: "Anonymous models are not supported by typespec-pydantic.",
  severity: "warning",
  messages: {
    default: "Anonymous models are not supported. Consider extracting your anonymous model into a named model.",
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (model.name === undefined || model.name === "") {
          context.reportDiagnostic({
            target: model,
          });
        }
      },
    };
  },
});
