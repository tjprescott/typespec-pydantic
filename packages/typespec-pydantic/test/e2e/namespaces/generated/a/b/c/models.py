from pydantic import BaseModel, Field
from a import ModelA
from a.b import ModelB
from typing import Optional

class ModelC(BaseModel):
    name: str

    a: Optional[ModelA] = Field(default=None)

    b: Optional[ModelB] = Field(default=None)



