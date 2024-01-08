from a import ModelA
from a.b import ModelB
from pydantic import Field, BaseModel
from typing import Optional

class ModelC(BaseModel):
    name: str

    a: Optional[ModelA] = Field(default=None)

    b: Optional[ModelB] = Field(default=None)

