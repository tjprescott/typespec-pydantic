import { resolvePath } from "@typespec/compiler";
import { createTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const DjangoTestLibrary = createTestLibrary({
  name: "typespec-django",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../.."),
});
