import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { compare } from "typespec-python/testing";
import { strictEqual } from "assert";
import { flaskOutputFor } from "./test-host.js";

describe("typespec-flask: core", () => {
  describe("operations", () => {
    it("supports simple parameters", async () => {
      const input = `
        op myFoo(name: string, age: int16): boolean;`;
      const expectOp = `
        from _operations import _my_foo
        from flask import Flask

        app = Flask(__name__)

        @app.route("/", methods=["POST"])
        def my_foo(name: str, age: int) -> bool:
            return _my_foo(name, age)`;
      const expectInit = `
        from operations import my_foo
        
        __all__ = ["my_foo"]`;
      const expectImpl = `
        def _my_foo(name: str, age: int) -> bool:
            # TODO: Implement this
            raise NotImplementedError("Implement _my_foo")`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      // ensure that operations.py, _operations.py, and __init__.py are created as expected
      compare(expectOp, results[0].contents, false);
      compare(expectInit, results[1].contents, false);
      compare(expectImpl, results[2].contents, false);
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
      const opExpect = `
        from models import A, B
        from _operations import _my_foo
        from flask import Flask

        app = Flask(__name__)

        @app.route("/", methods=["POST"])
        def my_foo(a: A) -> B:
            return _my_foo(a)`;
      const initExpect = `
        from operations import my_foo
        
        __all__ = ["my_foo"]`;
      const implExpect = `
        from models import A, B

        def _my_foo(a: A) -> B:
            # TODO: Implement this
            raise NotImplementedError("Implement _my_foo")`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(opExpect, results[0].contents, false);
      compare(initExpect, results[1].contents, false);
      compare(implExpect, results[2].contents, false);
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
      const opExpect = `
        from typing import List
        from models import A, B
        from _operations import _my_foo
        from flask import Flask

        app = Flask(__name__)

        @app.route("/", methods=["POST"])
        def my_foo(body: List[A]) -> List[B]:
            return _my_foo(body)`;
      const implExpect = `
        from typing import List
        from models import A, B

        def _my_foo(body: List[A]) -> List[B]:
            # TODO: Implement this
            raise NotImplementedError("Implement _my_foo")`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      compare(opExpect, results[0].contents, false);
      compare(implExpect, results[2].contents, false);
    });

    it("supports namespaces", async () => {
      const input = `
        @service
        namespace FooService {
          model A {
            name: string;
          }

          namespace Bar {
            model B {
              name: string;
            }

            op myFoo(a: A): B;
          }
        }`;
      const fooServiceInitExpect = ``;
      const barOpExpect = `
        from foo_service import A
        from foo_service.bar import B
        from foo_service.bar._operations import _my_foo
        from flask import Flask

        app = Flask(__name__)

        @app.route("/", methods=["POST"])
        def my_foo(a: A) -> B:
            return _my_foo(a)`;
      const barImplExpect = `
        from foo_service import A
        from foo_service.bar import B

        def _my_foo(a: A) -> B:
            # TODO: Implement this
            raise NotImplementedError("Implement _my_foo")`;
      const barInitExpect = `
        from foo_service.bar.operations import my_foo

        __all__ = ["my_foo"]`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      // verify files are created at the right paths
      strictEqual(results.length, 4);
      // verify paths
      strictEqual(results[0].path, "typespec-flask/foo_service/bar/operations.py");
      strictEqual(results[1].path, "typespec-flask/foo_service/bar/__init__.py");
      strictEqual(results[2].path, "typespec-flask/foo_service/bar/_operations.py");
      strictEqual(results[3].path, "typespec-flask/foo_service/__init__.py");

      // verify file contents
      compare(barOpExpect, results[0].contents, false);
      compare(barInitExpect, results[1].contents, false);
      compare(barImplExpect, results[2].contents, false);
      compare(fooServiceInitExpect, results[3].contents, false);
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

    it("support interfaces with namespaces", async () => {
      const input = `
      using TypeSpec.Http;

      namespace Widgets {
        model Widget {
          @visibility("read", "update")
          @key
          @path
          id: string;
          parts: Parts.Part[];
        }
        
        @error
        model Error {
          code: int32;
          message: string;
        }
        
        @route("/widgets")
        interface WidgetOps {
          @get list(): Widget[] | Error;
          @get read(@path id: string): Widget | Error;
        }

        namespace Parts {
          model Part {
            @visibility("read", "update")
            @key
            @path
            id: string;

            name: string;
          }

          @route("/parts")
          interface PartOps {
            @get list(): Part[] | Error;
            @get read(@path id: string): Part | Error;
          }
        }  
      };`;
      const [results, diagnostics] = await flaskOutputFor(input);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(results.length, 6);

      // verify file contents
      compare(
        `
        from typing import List, Union
        from widgets import Widget, Error
        from widgets._operations import _widget_ops_list, _widget_ops_read
        from flask import Flask

        app = Flask(__name__)

        @app.route("/widgets", methods=["GET"])
        def widget_ops_list() -> Union[List[Widget], Error]:
            return _widget_ops_list()

        @app.route("/widgets/<id>", methods=["GET"])
        def widget_ops_read(id: str) -> Union[Widget, Error]:
            return _widget_ops_read(id)`,
        results[0].contents,
        false,
      );
      compare(
        `
        from typing import List, Union
        from widgets.parts import Part
        from widgets import Error
        from widgets.parts._operations import _part_ops_list, _part_ops_read
        from flask import Flask

        app = Flask(__name__)

        @app.route("/parts", methods=["GET"])
        def part_ops_list() -> Union[List[Part], Error]:
            return _part_ops_list()

        @app.route("/parts/<id>", methods=["GET"])
        def part_ops_read(id: str) -> Union[Part, Error]:
            return _part_ops_read(id)`,
        results[1].contents,
        false,
      );
      compare(
        `
        from widgets.parts.operations import part_ops_list, part_ops_read

        __all__ = ["part_ops_list", "part_ops_read"]`,
        results[2].contents,
        false,
      );
      compare(
        `
        from typing import List, Union
        from widgets.parts import Part
        from widgets import Error
        
        def _part_ops_list() -> Union[List[Part], Error]:
            # TODO: Implement this
            raise NotImplementedError("Implement _part_ops_list")
        
        def _part_ops_read(id: str) -> Union[Part, Error]:
            # TODO: Implement this
            raise NotImplementedError("Implement _part_ops_read")`,
        results[3].contents,
        false,
      );
      compare(
        `
        from widgets.operations import widget_ops_list, widget_ops_read

        __all__ = ["widget_ops_list", "widget_ops_read"]`,
        results[4].contents,
        false,
      );
      compare(
        `
        from typing import List, Union
        from widgets import Widget, Error

        def _widget_ops_list() -> Union[List[Widget], Error]:
            # TODO: Implement this
            raise NotImplementedError("Implement _widget_ops_list")
        
        def _widget_ops_read(id: str) -> Union[Widget, Error]:
            # TODO: Implement this
            raise NotImplementedError("Implement _widget_ops_read")`,
        results[5].contents,
        false,
      );
    });
  });
});
