import abc
import smtplib
import asyncio
from email.message import EmailMessage
from core.config import settings

class EmailProvider(abc.ABC):
    @abc.abstractmethod
    async def send_email(self, to: str, subject: str, body: str, html: bool = False) -> None:
        pass

class SMTPEmailProvider(EmailProvider):
    def __init__(self):
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.user = settings.smtp_user
        self.password = settings.smtp_password.get_secret_value() if settings.smtp_password else ""

    async def send_email(self, to: str, subject: str, body: str, html: bool = False) -> None:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = settings.email_from
        msg["To"] = to
        if html:
            msg.set_content("Please enable HTML to view this email.")
            msg.add_alternative(body, subtype="html")
        else:
            msg.set_content(body)

        loop = asyncio.get_running_loop()
        def _send():
            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.send_message(msg)
        await loop.run_in_executor(None, _send)

class ResendEmailProvider(EmailProvider):
    def __init__(self):
        import resend
        resend.api_key = settings.resend_api_key.get_secret_value()
        self.resend = resend

    async def send_email(self, to: str, subject: str, body: str, html: bool = False) -> None:
        params = {
            "from": settings.email_from,
            "to": to,
            "subject": subject,
        }
        if html:
            params["html"] = body
        else:
            params["text"] = body
            
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self.resend.Emails.send, params)

class DummyEmailProvider(EmailProvider):
    async def send_email(self, to: str, subject: str, body: str, html: bool = False) -> None:
        print(f"DUMMY EMAIL SENT TO: {to}")
        print(f"SUBJECT: {subject}")
        print(f"BODY:\n{body}")

def get_email_provider() -> EmailProvider:
    provider = getattr(settings, "email_provider", "dummy").lower()
    if provider == "smtp":
        return SMTPEmailProvider()
    elif provider == "resend":
        return ResendEmailProvider()
    return DummyEmailProvider()
