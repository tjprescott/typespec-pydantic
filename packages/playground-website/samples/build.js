// @ts-check
import { buildSamples_experimental } from "@typespec/playground/tooling";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");

await buildSamples_experimental(packageRoot, resolve(__dirname, "dist/samples.js"), {
  "Basic": {
    filename: "samples/my.tsp",
    preferredEmitter: "typespec-pydantic",
    compilerOptions: { linterRuleSet: { extends: ["@typespec/http/all"] } },
  },
  "Protobuf Kiosk": {
    filename: "samples/kiosk.tsp",
    preferredEmitter: "@typespec/protobuf",
  },
  "Json Schema": {
    filename: "samples/json-schema.tsp",
    preferredEmitter: "@typespec/json-schema",
  },
});
