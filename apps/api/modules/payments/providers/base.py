from abc import ABC, abstractmethod
from typing import Any, Optional


class BasePaymentProvider(ABC):
    """Provider-agnostic payment interface. Implementations must never see or
    store secrets beyond their own credentials."""

    name: str = "base"

    @abstractmethod
    async def create_order(
        self,
        amount: int,
        currency: str,
        receipt: str,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create a provider-side order. Returns dict with at least `id`."""

    @abstractmethod
    async def verify_signature(self, payload: str, signature: str, secret: str) -> bool:
        pass

    @abstractmethod
    async def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        pass

    async def refund(
        self, provider_payment_id: str, amount: Optional[int] = None, speed: str = "normal", provider_order_id: Optional[str] = None
    ) -> dict[str, Any]:
        """Issue a full (amount=None) or partial refund. Returns refund dict."""
        raise NotImplementedError(f"{self.name} provider does not support refunds")
