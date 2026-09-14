from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

CardType = Literal["CREDIT", "DEBIT", "ALL"]


class BankOfferBase(BaseModel):
    bank_name: str = Field(..., min_length=1, max_length=80)
    card_type: CardType = "ALL"
    discount_text: str = Field(..., min_length=1, max_length=200)
    poster_url: Optional[str] = Field(None, max_length=2048)
    link: Optional[str] = Field(None, max_length=500)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    position: int = Field(0, ge=0, le=99999)
    is_active: bool = True
    # Empty list = sitewide (offer applies to every product).
    product_ids: List[str] = Field(default_factory=list, max_length=500)


class BankOfferCreate(BankOfferBase):
    pass


# PUT is a full replace (same contract as catalogues): the client always
# submits the complete offer, including the eligibility list.
class BankOfferUpdate(BankOfferBase):
    pass


class BankOfferResponse(BankOfferBase):
    id: str

    class Config:
        from_attributes = True
