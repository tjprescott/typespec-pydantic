import { resolvePath } from "@typespec/compiler";
import { createTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const PythonTestLibrary = createTestLibrary({
  name: "typespec-python",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../.."),
});
