from pydantic import BaseModel, Field
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from a import ModelA
    from a.b.c import ModelC

class ModelB(BaseModel):
    name: str

    a: Optional[ModelA] = Field(default=None)

    c: Optional[ModelC] = Field(default=None)



