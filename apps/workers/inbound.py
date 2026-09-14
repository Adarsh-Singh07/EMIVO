"""IMAP inbound: turn customer emails into support tickets.

Runs as an ARQ cron job, gated by EMAIL_IMAP_ENABLED (off by default — it
reads the owner's mailbox). Only mail addressed to the monitored aliases is
processed; mail from our own domain is ignored to prevent loops; Message-IDs
are deduped in Redis; registered customers get a new ticket (or a reply
appended to their open ticket), unknown senders are skipped — no
password-less accounts are ever auto-created.
"""
import email
import logging
import os
import re
from email.header import decode_header, make_header
from email.utils import parseaddr
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_MAX_BODY = 10000


def _decode(value: Any) -> str:
    try:
        return str(make_header(decode_header(value or "")))
    except Exception:
        return str(value or "")


def _body_text(msg: email.message.Message) -> str:
    """Prefer the plain-text part; fall back to HTML stripped to text."""
    if msg.is_multipart():
        plain = html = None
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype == "text/plain" and plain is None and not part.get_filename():
                plain = part.get_payload(decode=True)
            elif ctype == "text/html" and html is None and not part.get_filename():
                html = part.get_payload(decode=True)
        raw = plain if plain is not None else html
    else:
        raw = msg.get_payload(decode=True)
    if raw is None:
        return ""
    text = raw.decode("utf-8", errors="replace")
    if "<" in text:  # crude HTML → text
        text = re.sub(r"<style.*?</style>|<script.*?</script>", " ", text, flags=re.S | re.I)
        text = re.sub(r"<br\s*/?>|</p>", "\n", text, flags=re.I)
        text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()[:_MAX_BODY]


def parse_message(raw: bytes) -> Optional[Dict[str, Any]]:
    """Parse a raw RFC822 email into the dict the processor expects."""
    try:
        msg = email.message_from_bytes(raw)
        subject = _decode(msg.get("Subject", "")).strip()
        from_addr = parseaddr(msg.get("From", ""))[1].lower()
        to_addrs = [
            parseaddr(a)[1].lower()
            for a in _decode(msg.get("To", "")).split(",")
        ]
        return {
            "message_id": (msg.get("Message-ID") or "").strip(),
            "subject": subject or "(no subject)",
            "from": from_addr,
            "to": to_addrs,
            "body": _body_text(msg),
        }
    except Exception:
        logger.exception("inbound: failed to parse message")
        return None


async def process_inbound_message(session, redis_client, msg: Dict[str, Any]) -> str:
    """Route one parsed email into the support desk. Returns the action taken
    (one of: loop, not-monitored, duplicate, no-user, replied, ticket)."""
    from sqlalchemy import text

    own_domain = "elektrix.in"
    monitored = {
        a.strip().lower()
        for a in os.getenv("EMAIL_IMAP_MONITORED", "support@elektrix.in").split(",")
        if a.strip()
    }

    if msg["from"].endswith("@" + own_domain):
        return "loop"  # our own outbound mail echoing back — never a ticket
    if not (set(msg["to"]) & monitored):
        return "not-monitored"

    key = f"imap:msgid:{msg['message_id']}" if msg["message_id"] else None
    if key:
        if not await redis_client.set(key, "1", nx=True, ex=30 * 86400):
            return "duplicate"

    sender = msg["from"]
    body = msg["body"] or "(empty body)"
    subject = msg["subject"]

    user = (await session.execute(
        text("""
            SELECT id FROM users
            WHERE email = :email AND is_active AND deleted_at IS NULL
            LIMIT 1
        """),
        {"email": sender},
    )).first()
    if not user:
        # Deliberately do NOT auto-create accounts from inbound mail.
        return "no-user"
    user_id = str(user[0])

    from modules.support.service import SupportService

    svc = SupportService(session)
    open_ticket = (await session.execute(
        text("""
            SELECT id FROM support_tickets
            WHERE user_id = :uid AND status IN ('open', 'in_progress')
            ORDER BY created_at DESC LIMIT 1
        """),
        {"uid": user_id},
    )).first()

    if open_ticket:
        await svc.add_message(str(open_ticket[0]), user_id, "user", body)
        return "replied"
    await svc.create_ticket(user_id, "other", f"[Email] {subject}"[:200], body)
    return "ticket"


async def email_inbound(ctx) -> int:
    """ARQ entrypoint: fetch unseen mail from IMAP and process each one.
    Returns the number of messages processed (any action)."""
    from core.config import settings

    if not settings.email_imap_enabled:
        return 0

    import imaplib
    import ssl as _ssl
    from core.database import engine
    from sqlalchemy.ext.asyncio import async_sessionmaker

    count = 0
    conn = imaplib.IMAP4_SSL(settings.email_imap_host, settings.email_imap_port,
                             ssl_context=_ssl.create_default_context())
    try:
        conn.login(settings.email_smtp_user, settings.email_smtp_password.get_secret_value())
        conn.select("INBOX")
        status, data = conn.search(None, "UNSEEN")
        if status != "OK" or not data or not data[0]:
            return 0
        ids = data[0].split()[:50]  # cap per run
        maker = async_sessionmaker(engine, expire_on_commit=False)
        for num in ids:
            st, fetched = conn.fetch(num, "(RFC822)")
            if st != "OK" or not fetched or fetched[0] is None:
                continue
            raw = fetched[0][1]
            parsed = parse_message(raw if isinstance(raw, bytes) else b"")
            if not parsed:
                conn.store(num, "+FLAGS", "\\Seen")  # unreadable: don't retry forever
                continue
            async with maker() as session:
                action = await process_inbound_message(session, ctx["redis"], parsed)
                await session.commit()
            conn.store(num, "+FLAGS", "\\Seen")
            count += 1
            logger.info("inbound: %s -> %s", parsed["from"], action)
    finally:
        try:
            conn.logout()
        except Exception:
            pass
    return count
