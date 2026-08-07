from abc import ABC, abstractmethod
from typing import Any


class BasePaymentProvider(ABC):
    @abstractmethod
    async def create_order(
        self,
        amount: float,
        currency: str,
        receipt: str,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        pass

    @abstractmethod
    async def verify_signature(self, payload: str, signature: str, secret: str) -> bool:
        pass

    @abstractmethod
    async def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        pass
