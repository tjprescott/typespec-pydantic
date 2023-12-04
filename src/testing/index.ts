import { resolvePath } from "@typespec/compiler";
import { createTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const PydanticTestLibrary = createTestLibrary({
    name: "typespec-pydantic",
    packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../.."),
  });
