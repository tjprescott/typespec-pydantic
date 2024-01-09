from pydantic import BaseModel
from type_spec import Array
from typing import List

class Widget(BaseModel):
    name: str

    parts: List[Part]



