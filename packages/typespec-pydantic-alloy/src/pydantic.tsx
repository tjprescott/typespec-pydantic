import { Output } from "@alloy-js/core";
import { EmitContext, emitFile } from "@typespec/compiler";

export async function $onEmit(context: EmitContext) {
  if (context.program.compilerOptions.noEmit) return;

  return <Output basePath={context.emitterOutputDir}></Output>;
}
