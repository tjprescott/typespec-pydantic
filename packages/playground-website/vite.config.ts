import { definePlaygroundViteConfig } from "@typespec/playground/vite";
import { defineConfig } from "vite";

const githubUrl = `https://github.com/tjprescott/typespec-pydantic`;
const customConfig = definePlaygroundViteConfig({
  defaultEmitter: "typespec-pydantic",
  libraries: ["@typespec/compiler", "typespec-pydantic"],
  samples: {
    "My sample": {
      filename: "samples/basic.tsp",
      preferredEmitter: "typespec-pydantic",
    },
  },
  links: {
    githubIssueUrl: `${githubUrl}/issues`,
    documentationUrl: `${githubUrl}/blob/master/README.md`,
  },
});
// old value "./" for local testing
customConfig.base = githubUrl;
const config = defineConfig(customConfig);

export default config;
