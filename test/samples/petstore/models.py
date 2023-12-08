from pydantic import *
from typing import *
from datetime import *
from decimal import *
from enum import Enum

class Pet(BaseModel):
    name: str
    tag: Optional[str]
    age: int


class Toy(BaseModel):
    id: int
    pet_id: int
    name: str


class Error(BaseModel):
    code: int
    message: str


class PetId(BaseModel):
    pet_id: int


