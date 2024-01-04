from typing import List
from pydantic import BaseModel
from .parts import Part

class Widget(BaseModel):
    name: str

    parts: List[Part]
