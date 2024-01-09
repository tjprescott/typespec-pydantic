namespace Widgets {
  namespace Parts {
    model Part {
      name: string;
    }
  }

  model Widget {
    name: string;
    parts: Parts.Part[];
  }
}

namespace A {
  model ModelA {
    name: string;
    b?: B.ModelB;
    c?: B.C.ModelC;
  }

  namespace B {
    model ModelB {
      name: string;
      a?: ModelA;
      c?: C.ModelC;
    }

    namespace C {
      model ModelC {
        name: string;
        a?: ModelA;
        b?: ModelB;
      }
    }
  }
}
