from typing import List
from pydantic import BaseModel

class Widget(BaseModel):
    name: str

    parts: List[Part]



