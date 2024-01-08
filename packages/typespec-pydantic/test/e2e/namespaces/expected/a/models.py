from pydantic import Field, BaseModel
from typing import TYPE_CHECKING, Optional
from a.b import ModelB

if TYPE_CHECKING:
  from a.b.c import ModelC

class ModelA(BaseModel):
    name: str

    b: Optional[ModelB] = Field(default=None)

    c: Optional["ModelC"] = Field(default=None)
