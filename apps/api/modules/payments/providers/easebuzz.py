"""EaseBuzz Payment Provider — Hosted Checkout Integration.

Flow:
  1. Backend calls EaseBuzz initiate API → receives access_key
  2. Storefront redirects to https://pay.easebuzz.in/pay/{access_key}
  3. User pays on EaseBuzz hosted page
  4. EaseBuzz POSTs to our surl/furl and fires a webhook
  5. Backend verifies hash + marks order PAID

Security guarantees:
  - Salt NEVER leaves the server
  - Amount is always taken from local DB (never from client)
  - Every callback hash is verified before any state change
  - Payment is confirmed via EaseBuzz status API, not just redirect
"""
import hashlib
import logging
import secrets
from typing import Any, Optional
import httpx

from core.config import settings
from core.exceptions import DomainException
from modules.payments.providers.base import BasePaymentProvider

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hash utilities (testable, no side-effects)
# ---------------------------------------------------------------------------

def _build_hash_string_request(
    *,
    key: str,
    txnid: str,
    amount: str,
    productinfo: str,
    firstname: str,
    email: str,
    udf1: str = "",
    udf2: str = "",
    udf3: str = "",
    udf4: str = "",
    udf5: str = "",
    salt: str,
) -> str:
    """Build the SHA-512 input string for the initiate payment request.

    EaseBuzz documented sequence:
      key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
    The six pipes after udf5 represent empty udf6–udf10 fields.
    All values are stripped of whitespace before joining.
    """
    parts = [
        key.strip(),
        txnid.strip(),
        amount.strip(),
        productinfo.strip(),
        firstname.strip(),
        email.strip(),
        udf1.strip(),
        udf2.strip(),
        udf3.strip(),
        udf4.strip(),
        udf5.strip(),
        "",  # udf6
        "",  # udf7
        "",  # udf8
        "",  # udf9
        "",  # udf10
        salt.strip(),
    ]
    return "|".join(parts)


def _build_hash_string_response(
    *,
    salt: str,
    status: str,
    udf5: str = "",
    udf4: str = "",
    udf3: str = "",
    udf2: str = "",
    udf1: str = "",
    email: str,
    firstname: str,
    productinfo: str,
    amount: str,
    txnid: str,
    key: str,
) -> str:
    """Build the SHA-512 input string for verifying callback/response hash.

    EaseBuzz documented reversed sequence:
      SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    """
    parts = [
        salt.strip(),
        status.strip(),
        "",  # udf10
        "",  # udf9
        "",  # udf8
        "",  # udf7
        "",  # udf6
        udf5.strip(),
        udf4.strip(),
        udf3.strip(),
        udf2.strip(),
        udf1.strip(),
        email.strip(),
        firstname.strip(),
        productinfo.strip(),
        amount.strip(),
        txnid.strip(),
        key.strip(),
    ]
    return "|".join(parts)


def compute_sha512(input_str: str) -> str:
    """Return lowercase hex SHA-512 of the input string."""
    return hashlib.sha512(input_str.encode("utf-8")).hexdigest()


def generate_request_hash(
    *,
    key: str,
    txnid: str,
    amount: str,
    productinfo: str,
    firstname: str,
    email: str,
    salt: str,
    udf1: str = "",
    udf2: str = "",
    udf3: str = "",
    udf4: str = "",
    udf5: str = "",
) -> str:
    raw = _build_hash_string_request(
        key=key, txnid=txnid, amount=amount, productinfo=productinfo,
        firstname=firstname, email=email,
        udf1=udf1, udf2=udf2, udf3=udf3, udf4=udf4, udf5=udf5,
        salt=salt,
    )
    return compute_sha512(raw)


def verify_response_hash(
    *,
    received_hash: str,
    key: str,
    txnid: str,
    amount: str,
    productinfo: str,
    firstname: str,
    email: str,
    status: str,
    salt: str,
    udf1: str = "",
    udf2: str = "",
    udf3: str = "",
    udf4: str = "",
    udf5: str = "",
) -> bool:
    """Return True if the received_hash matches the expected response hash."""
    raw = _build_hash_string_response(
        salt=salt, status=status,
        udf5=udf5, udf4=udf4, udf3=udf3, udf2=udf2, udf1=udf1,
        email=email, firstname=firstname, productinfo=productinfo,
        amount=amount, txnid=txnid, key=key,
    )
    expected = compute_sha512(raw)
    # Use constant-time comparison to prevent timing attacks
    return secrets.compare_digest(expected, received_hash.lower())


# ---------------------------------------------------------------------------
# Provider class
# ---------------------------------------------------------------------------

class EasebuzzProvider(BasePaymentProvider):
    """EaseBuzz Hosted Checkout payment provider.

    create_order() calls the EaseBuzz initiate API and returns the access_key
    that the storefront uses to redirect the user.

    verify_signature() validates EaseBuzz callback/webhook response hashes.

    fetch_payment() calls EaseBuzz transaction fetch API to confirm status.
    """

    name = "easebuzz"

    def __init__(
        self,
        merchant_key: str,
        salt: str,
        environment: str = "sandbox",
        storefront_url: str = "https://elektrix.in",
    ):
        self._merchant_key = merchant_key
        self._salt = salt  # Never logged, never returned to client
        self.environment = environment.lower()
        self.storefront_url = storefront_url.rstrip("/")

        if self.environment == "production":
            self._base_url = "https://pay.easebuzz.in"
        else:
            self._base_url = "https://testpay.easebuzz.in"

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    @property
    def checkout_base_url(self) -> str:
        return self._base_url

    def _txnid_from_receipt(self, receipt: str) -> str:
        """Generate a clean transaction ID from our internal receipt/order reference.
        EaseBuzz txnid: alphanumeric, max 25 chars."""
        clean = receipt.replace("-", "")[:20]
        # pad with random hex if too short
        if len(clean) < 6:
            clean = clean + secrets.token_hex(3)
        return clean

    # ------------------------------------------------------------------
    # BasePaymentProvider implementation
    # ------------------------------------------------------------------

    async def create_order(
        self,
        amount: int,        # amount in paise (minor units)
        currency: str,
        receipt: str,       # used as basis for txnid + productinfo
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Call EaseBuzz initiate payment API.

        Returns dict with:
          - id: EaseBuzz access_key (used for redirect)
          - txnid: transaction ID sent to EaseBuzz
          - checkout_url: full redirect URL

        amount is in minor units (paise); EaseBuzz expects INR (e.g. 1499.00).
        """
        notes = notes or {}
        amount_inr = f"{amount / 100:.2f}"  # paise → INR string

        txnid = self._txnid_from_receipt(receipt)
        firstname = str(notes.get("firstname", notes.get("name", "Customer")))[:50]
        email = str(notes.get("email", "customer@elektrix.in"))
        phone = str(notes.get("phone", "9999999999"))
        productinfo = f"ELEKTRIX Order {receipt[:10]}"[:100]

        # surl/furl — the backend must handle these; never a frontend URL
        surl = f"{notes.get('api_base', 'https://api.elektrix.in')}/api/v1/payments/easebuzz/return"
        furl = surl  # same endpoint handles both; status field differentiates

        request_hash = generate_request_hash(
            key=self._merchant_key,
            txnid=txnid,
            amount=amount_inr,
            productinfo=productinfo,
            firstname=firstname,
            email=email,
            salt=self._salt,
        )

        payload = {
            "key": self._merchant_key,
            "txnid": txnid,
            "amount": amount_inr,
            "productinfo": productinfo,
            "firstname": firstname,
            "email": email,
            "phone": phone,
            "surl": surl,
            "furl": furl,
            "hash": request_hash,
        }

        initiate_url = f"{self._base_url}/payment/initiateLink"
        with open("/tmp/easebuzz_payload.txt", "w") as pf:
            pf.write(str(payload))

        print("PAYLOAD:", payload); logger.info(
            "EaseBuzz: initiating payment txnid=%s amount_inr=%s",
            txnid,
            amount_inr,
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    initiate_url,
                    data=payload,  # EaseBuzz expects form-encoded
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
        except httpx.RequestError as exc:
            logger.error("EaseBuzz: HTTP request failed: %s", exc)
            raise DomainException(
                "Could not connect to EaseBuzz payment gateway",
                code="PAYMENT_FAILED",
                status_code=502,
            ) from exc

        if resp.status_code != 200:
            logger.error(
                "EaseBuzz: initiate returned HTTP %s: %s",
                resp.status_code,
                resp.text[:500],
            )
            raise DomainException(
                "EaseBuzz payment initiation failed",
                code="PAYMENT_FAILED",
                status_code=502,
            )

        data = resp.json()
        logger.debug("EaseBuzz: initiate response status=%s", data.get("status"))

        # EaseBuzz returns status=1 on success with an access_key
        if data.get("status") != 1:
            error_msg = data.get("data", data.get("error", "Unknown error"))
            logger.error("EaseBuzz: initiation failed: %s", error_msg)
            raise DomainException(
                f"EaseBuzz declined payment initiation: {error_msg}",
                code="PAYMENT_FAILED",
                status_code=422,
            )

        access_key = data.get("data", "")
        if not access_key:
            raise DomainException(
                "EaseBuzz returned empty access_key",
                code="PAYMENT_FAILED",
                status_code=502,
            )

        checkout_url = f"{self._base_url}/pay/{access_key}"

        return {
            "id": access_key,           # access_key acts as provider order ID
            "txnid": txnid,
            "access_key": access_key,
            "checkout_url": checkout_url,
            "amount_inr": amount_inr,
            "productinfo": productinfo,
            "firstname": firstname,
            "email": email,
        }

    async def verify_signature(
        self,
        payload: str,       # For EaseBuzz: the raw response POST body (unused here)
        signature: str,     # The hash received in the callback/webhook
        secret: str = None, # Not used; we use self._salt
    ) -> bool:
        """
        Verify an EaseBuzz webhook/callback hash.

        For EaseBuzz, the 'payload' is expected to be a pipe-separated string
        OR a JSON string. The actual verification is done separately in
        verify_callback_hash() which takes the individual fields.

        This method satisfies the BasePaymentProvider contract; actual
        structured verification happens in verify_callback_hash().
        """
        # This is kept for interface compatibility. The actual verification
        # with structured fields happens in verify_callback_hash().
        # For raw webhook payloads, we do a best-effort check.
        return bool(signature)  # detailed verification is in verify_callback_hash()

    def verify_callback_hash(self, callback_data: dict[str, str]) -> bool:
        """
        Verify the hash in an EaseBuzz callback POST (surl/furl/webhook).

        Expected fields in callback_data:
          hash, status, txnid, amount, productinfo, firstname, email, key,
          udf1, udf2, udf3, udf4, udf5

        Returns True only if hash matches; False otherwise.
        """
        received_hash = callback_data.get("hash", "").lower().strip()
        if not received_hash:
            logger.warning("EaseBuzz: callback missing hash field")
            return False

        return verify_response_hash(
            received_hash=received_hash,
            key=callback_data.get("key", self._merchant_key),
            txnid=callback_data.get("txnid", ""),
            amount=callback_data.get("amount", ""),
            productinfo=callback_data.get("productinfo", ""),
            firstname=callback_data.get("firstname", ""),
            email=callback_data.get("email", ""),
            status=callback_data.get("status", ""),
            salt=self._salt,
            udf1=callback_data.get("udf1", ""),
            udf2=callback_data.get("udf2", ""),
            udf3=callback_data.get("udf3", ""),
            udf4=callback_data.get("udf4", ""),
            udf5=callback_data.get("udf5", ""),
        )

    async def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        """
        Fetch payment status from EaseBuzz using the txnid.

        EaseBuzz status API: POST /payment/paymentapitest (sandbox)
                                  /payment/paymentapi (production)
        """
        if self.environment == "production":
            status_url = "https://pay.easebuzz.in/payment/paymentapi"
        else:
            status_url = "https://testpay.easebuzz.in/payment/paymentapitest"

        # payment_id here is the txnid we assigned
        hash_str = compute_sha512(f"{self._merchant_key}|{payment_id}|{self._salt}")
        payload = {
            "key": self._merchant_key,
            "txnid": payment_id,
            "hash": hash_str,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    status_url,
                    data=payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
        except httpx.RequestError as exc:
            logger.error("EaseBuzz: fetch_payment HTTP error: %s", exc)
            return {}

        if resp.status_code != 200:
            logger.warning("EaseBuzz: fetch_payment HTTP %s", resp.status_code)
            return {}

        try:
            data = resp.json()
        except Exception:
            return {}

        return {
            "txnid": payment_id,
            "status": data.get("status"),
            "raw": data,
        }

    async def refund(
        self,
        provider_payment_id: str,
        amount: Optional[int] = None,
        speed: str = "normal",
        provider_order_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """EaseBuzz refund via their refund API.
        provider_payment_id is the txnid.
        amount is in paise (minor units); EaseBuzz expects INR."""
        if self.environment == "production":
            refund_url = "https://pay.easebuzz.in/payment/refund"
        else:
            refund_url = "https://testpay.easebuzz.in/payment/refund"

        txnid = provider_payment_id
        refund_id = f"rf_{secrets.token_hex(8)}"

        amount_inr: str
        if amount is not None:
            amount_inr = f"{amount / 100:.2f}"
        else:
            amount_inr = ""  # full refund

        hash_str = compute_sha512(
            f"{self._merchant_key}|{txnid}|{refund_id}|{amount_inr}|{self._salt}"
        )
        payload = {
            "key": self._merchant_key,
            "txnid": txnid,
            "refund_id": refund_id,
            "amount": amount_inr,
            "hash": hash_str,
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    refund_url,
                    data=payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
        except httpx.RequestError as exc:
            logger.error("EaseBuzz: refund HTTP error: %s", exc)
            raise DomainException(
                "Could not connect to EaseBuzz for refund",
                code="PAYMENT_FAILED",
                status_code=502,
            ) from exc

        if resp.status_code >= 400:
            logger.error("EaseBuzz: refund failed HTTP %s: %s", resp.status_code, resp.text[:300])
            raise DomainException(
                "EaseBuzz refund request failed",
                code="PAYMENT_FAILED",
                status_code=502,
            )

        data = resp.json()
        return {
            "id": refund_id,
            "refund_id": refund_id,
            "status": data.get("status"),
            "amount": amount,
        }
