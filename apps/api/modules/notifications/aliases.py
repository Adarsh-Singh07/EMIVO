"""Sender identities for outbound email.

All mail is SMTP-authenticated as the single Lark Mail account (configured via
EMAIL_SMTP_USER / EMAIL_SMTP_PASSWORD in the gitignored .env), but each class
of email presents a different elektrix.in alias so replies land in the right
place and customers see a purposeful sender:

  no-reply@  transactional (OTP, orders, payments, cart reminders)
             — Reply-To is set to support@ so answers still reach the desk
  support@   support-desk correspondence with customers
  contact@   INBOX for "Contact Us" form submissions
  admin@     internal staff alerts (low stock, system notices)
  hello@     marketing (newsletters, broadcast campaigns)

aman@elektrix.in is the owner's personal mailbox — never a system sender.
These strings are not secrets; only the SMTP credentials live in .env.
"""

ALIAS_TRANSACTIONAL = "ELEKTRIX <no-reply@elektrix.in>"
ALIAS_SUPPORT = "ELEKTRIX Support <support@elektrix.in>"
ALIAS_MARKETING = "ELEKTRIX <hello@elektrix.in>"
ALIAS_ADMIN = "ELEKTRIX <admin@elektrix.in>"

# Reply-To for automated mail: customer replies land in the support desk.
REPLY_TO_SUPPORT = "support@elektrix.in"

# Inbound destination for the public contact form.
CONTACT_INBOX = "contact@elektrix.in"
