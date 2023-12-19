# typespec-pydantic

An emitter to output Pydantic models from TypeSpec.

## Getting Started

This assumes you are using VSCode.

1. Clone the repo and navigate to the project root.
2. If you don't have `pnpm` on your machine, run `npm install -g pnpm`
3. Run `pnpm install`
4. Run `pnpm build` and `pnpm watch` so that changes to the emitter are picked up automatically.
5. Run `pnpm test`

## Running Tests

Install the Mocha Test Explorer for VSCode. You should be able to run all of the tests and debug into them.

## Running Manually

There's a `launch.json` configuration you can edit to run the emitter against a spec in the `packages\samples\scratch` folder.
