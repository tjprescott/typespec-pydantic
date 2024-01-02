import { resolvePath } from "@typespec/compiler";
import { createTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const FlaskTestLibrary = createTestLibrary({
  name: "typespec-flask",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../.."),
});
