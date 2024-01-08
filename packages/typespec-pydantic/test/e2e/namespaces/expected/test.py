from a import ModelA
from a.b import ModelB
from a.b.c import ModelC

test = ModelA(name="Foo", b=ModelB(name="Bar", a=None, c=None), c=ModelC(name="Baz", a=None, b=None))
print(test)
