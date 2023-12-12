from typing import *
from enum import Enum
from pydantic import BaseModel, Field, RootModel

class WidgetParts(RootModel):
    root: List[str]

    def __iter__(self):
        return iter(self.root)

    def __getitem__(self, item):
        return self.root[item]