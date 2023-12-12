import { definePlaygroundViteConfig } from "@typespec/playground/vite";
import { defineConfig } from "vite";

const config = defineConfig(definePlaygroundViteConfig({
  defaultEmitter: "typespec-pydantic",
  libraries: [
    "@typespec/compiler",
    "typespec-pydantic",
  ],
  samples: {
    "My sample": {
      filename: "samples/my.tsp",
      preferredEmitter: "typespec-pydantic",
    },
  },
  links: {
    githubIssueUrl: `https://github.com/tjprescott/typespec-pydantic/issues`,
    documentationUrl: `https://github.com/tjprescott/typespec-pydantic/blob/master/README.md`,
  },
}));

export default config;
