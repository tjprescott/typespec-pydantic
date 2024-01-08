from pydantic import Field, BaseModel
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
  from a import ModelA
  from a.b.c import ModelC
    
class ModelB(BaseModel):
    name: str

    a: Optional["ModelA"] = Field(default=None)

    c: Optional["ModelC"] = Field(default=None)

