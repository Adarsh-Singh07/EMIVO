from pydantic import BaseModel, Field
from typing import Optional

class OrderNotesUpdate(BaseModel):
    notes: Optional[str] = Field(None, max_length=2000)
