from pydantic import BaseModel, Field
from a.b import ModelB
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from a.b.c import ModelC

class ModelA(BaseModel):
    name: str

    b: Optional[ModelB] = Field(default=None)

    c: Optional["ModelC"] = Field(default=None)



