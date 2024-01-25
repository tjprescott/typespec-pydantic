import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { compare, flaskOutputFor } from "./test-host.js";

describe("typespec-flask: core", () => {
  describe("operations", () => {
    it("supports simple parameters", async () => {
      const input = `
        op myFoo(name: string, age: int16): boolean;`;
      const expect = `
        app = Flask(__name__)

        @app.route("/")
        def my_foo(name: str, age: int) -> bool:
            pass`;
      const [result, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });

    it("supports void return types", async () => {
      const input = `
        op myFoo(name: string): void;`;
      const expect = `
        app = Flask(__name__)

        @app.route("/")
        def my_foo(name: str) -> None:
            pass`;
      const [result, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
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

        @app.route("/")
        def my_foo(a: A) -> B:
            pass`;
      const [result, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
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

        @app.route("/")
        def my_foo(body: Union[A, B]) -> Union[A, B]:
            pass`;
      const [result, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
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

        @app.route("/")
        def my_foo(body: Tuple[A, B]) -> Tuple[A, B]:
            pass`;
      const [result, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
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

        @app.route("/")
        def my_foo(body: List[A]) -> List[B]:
            pass`;
      const [result, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
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
            pass
        
        @app.route("/widgets/<id>", methods=["GET"])
        def widgets_read(id: str) -> Union[Widget, Error]:
            pass
          
        @app.route("/widgets", methods=["POST"])
        def widgets_create(name: string) -> Union[Widget, Error]:
            pass
        
        @app.route("/widgets", methods=["PATCH"])
        def widgets_update(name: string) -> Union[Widget, Error]:
            pass

        @app.route("/widgets/<id>", methods=["DELETE"])
        def widgets_delete(id: str) -> Union[None, Error]:
            pass
        
        @app.route("/widgets/<id>/analyze", methods=["POST"])
        def widgets_analyze(id: str) -> Union[str, Error]:
            pass`;
      const [result, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(expect, result);
    });
  });
});
