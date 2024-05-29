import { resolvePath } from "@typespec/compiler";
import { createTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const DummyTestLibrary = createTestLibrary({
  name: "typespec-dummy",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../.."),
});
