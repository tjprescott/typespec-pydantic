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
});
