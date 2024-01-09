import { resolvePath } from "@typespec/compiler";
import { createTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const PythonServerTestLibrary = createTestLibrary({
  name: "typespec-python-server",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../.."),
});
