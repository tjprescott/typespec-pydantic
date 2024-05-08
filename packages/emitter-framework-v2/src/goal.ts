import { EmitContext, emitFile, resolvePath } from "@typespec/compiler";
import { AssetEmitter } from "./types.js";

// export async function $onEmit(context: EmitContext) {
//   const assetEmitter = context.getAssetEmitter(MyTypeEmitter);

//   // emit my entire TypeSpec program
//   assetEmitter.emitProgram();

//   // lastly, write your emit output into the output directory
//   await assetEmitter.writeOutput();
// }

interface Foo {
  talk(): string;
}

function doFoo(foo: Foo) {
  return foo.talk();
}

class FooClass implements Foo {
  talk() {
    return "hello";
  }
}

const myImpliedFoo = {
  talk() {
    return "yaaas";
  },
};

console.log(doFoo(new FooClass()));
console.log(doFoo(myImpliedFoo));
