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
