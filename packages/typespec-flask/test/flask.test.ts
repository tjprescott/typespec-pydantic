import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { checkImports, compare } from "typespec-python/testing";
import { strictEqual } from "assert";
import { flaskOutputFor } from "./test-host.js";

describe("typespec-flask: core", () => {
  describe("operations", () => {
    it("supports simple parameters", async () => {
      const input = `
        op myFoo(name: string, age: int16): boolean;`;
      const expect = `
        app = Flask(__name__)

        @app.route("/", methods=["POST"])
        def my_foo(name: str, age: int) -> bool:
            return _my_foo(name, age)`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, results[0].contents);
      checkImports(
        new Map([
          ["._operations", ["_my_foo"]],
          ["flask", ["Flask"]],
        ]),
        results[0].contents,
      );
    });

    it("supports void return types", async () => {
      const input = `
        op myFoo(name: string): void;`;
      const expect = `
        app = Flask(__name__)

        @app.route("/", methods=["POST"])
        def my_foo(name: str) -> None:
            return _my_foo(name)`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, results[0].contents);
    });

    it("supports model references", async () => {
      const input = `
        model A {
          name: string;
        }

        model B {
          name: string;
        }

        op myFoo(a: A): B;`;
      const expect = `
        app = Flask(__name__)

        @app.route("/", methods=["POST"])
        def my_foo(a: A) -> B:
            return _my_foo(a)`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, results[0].contents);
    });

    it("supports unions references", async () => {
      const input = `
        model A {
          name: string;
        }

        model B {
          name: string;
        }

        op myFoo(body: A | B): A | B;`;
      const expect = `
        app = Flask(__name__)

        @app.route("/", methods=["POST"])
        def my_foo(body: Union[A, B]) -> Union[A, B]:
            return _my_foo(body)`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, results[0].contents);
    });

    it("supports tuple references", async () => {
      const input = `
        model A {
          name: string;
        }

        model B {
          name: string;
        }

        op myFoo(body: [A, B]): [A, B];`;
      const expect = `
        app = Flask(__name__)

        @app.route("/", methods=["POST"])
        def my_foo(body: Tuple[A, B]) -> Tuple[A, B]:
            return _my_foo(body)`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, results[0].contents);
    });

    it("supports array references", async () => {
      const input = `
        model A {
          name: string;
        }

        model B {
          name: string;
        }

        op myFoo(body: A[]): B[];`;
      const expect = `
        app = Flask(__name__)

        @app.route("/", methods=["POST"])
        def my_foo(body: List[A]) -> List[B]:
            return _my_foo(body)`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, results[0].contents);
    });

    it("supports namespaces", async () => {
      const input = `
        namespace FooService {
          op myFoo(name: string, age: int16): boolean;
        }`;
      const initExpect = `
        from .operations import my_foo

        __all__ = ["my_foo"]`;
      const opExpect = `
        app = Flask(__name__)

        @app.route("/", methods=["POST"])
        def my_foo(name: str, age: int) -> bool:
            return _my_foo(name, age)`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(results.length, 2);
      compare(opExpect, results[0].contents);
      compare(initExpect, results[1].contents, false);
    });
  });

  describe("interfaces", () => {
    it("flattens interfaces", async () => {
      const input = `
        model Widget {
          name: string;
        }

        model Error {
          id: string;
          msg?: string;
        }
        
        using TypeSpec.Http;

        @route("/widgets")
        @tag("Widgets")
        interface Widgets {
          @get list(): Widget[] | Error;
          @get read(@path id: string): Widget | Error;
          @post create(...Widget): Widget | Error;
          @patch update(...Widget): Widget | Error;
          @delete delete(@path id: string): void | Error;
          @route("{id}/analyze") @post analyze(@path id: string): string | Error;
        }`;
      const expect = `
        app = Flask(__name__)

        @app.route("/widgets", methods=["GET"])
        def widgets_list() -> Union[List[Widget], Error]:
            return _widgets_list()
        
        @app.route("/widgets/<id>", methods=["GET"])
        def widgets_read(id: str) -> Union[Widget, Error]:
            return _widgets_read(id)
          
        @app.route("/widgets", methods=["POST"])
        def widgets_create(name: str) -> Union[Widget, Error]:
            return _widgets_create(name)
        
        @app.route("/widgets", methods=["PATCH"])
        def widgets_update(name: str) -> Union[Widget, Error]:
            return _widgets_update(name)

        @app.route("/widgets/<id>", methods=["DELETE"])
        def widgets_delete(id: str) -> Union[None, Error]:
            return _widgets_delete(id)
        
        @app.route("/widgets/<id>/analyze", methods=["POST"])
        def widgets_analyze(id: str) -> Union[str, Error]:
            return _widgets_analyze(id)`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, results[0].contents);
    });
  });
});
