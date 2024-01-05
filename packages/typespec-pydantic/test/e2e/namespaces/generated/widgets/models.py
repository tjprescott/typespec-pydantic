from typing import List
from ../ import Part
from pydantic import BaseModel

class Widget(BaseModel):
    name: str

    parts: List[Part]





