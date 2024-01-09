from typing import List
from widgets.parts import Part
from pydantic import BaseModel

class Widget(BaseModel):
    name: str

    parts: List[Part]
