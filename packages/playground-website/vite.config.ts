import { definePlaygroundViteConfig } from "@typespec/playground/vite";
import { defineConfig } from "vite";

const githubUrl = `https://github.com/tjprescott/typespec-pydantic`;
const config = defineConfig(
  definePlaygroundViteConfig({
    defaultEmitter: "typespec-python-server",
    libraries: [
      "@typespec/compiler",
      "@typespec/http",
      "@typespec/rest",
      "@typespec/openapi",
      "@typespec/versioning",
      "@azure-tools/typespec-azure-core",
      "@azure-tools/typespec-autorest",
      "@azure-tools/typespec-azure-resource-manager",
      "@azure-tools/typespec-client-generator-core",
      "typespec-python-server",
      "typespec-pydantic",
      "typespec-flask",
      "typespec-python",
      "typespec-django",
    ],
    samples: {
      "Basic Sample": {
        filename: "samples/basic.tsp",
        preferredEmitter: "typespec-python-server",
      },
      "Azure Sample": {
        filename: "samples/azure.tsp",
        preferredEmitter: "typespec-python-server",
      },
    },
    links: {
      documentationUrl: `${githubUrl}/blob/master/README.md`,
    },
  }),
);

export default config;
