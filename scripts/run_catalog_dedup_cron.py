"""Nightly 12:00 AM Catalog Deduplication Cron Worker.
Scans active products, identifies potential duplicates with AI, and notifies Admin.
"""
import asyncio
import logging
import os
import sys

# Add apps/api to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

from core.database import async_session_maker
from modules.sellers.service import SellerService
from core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("catalog-dedup-cron")


async def main():
    logger.info("Starting Daily 12:00 AM AI Catalog Deduplication Job...")
    async with async_session_maker() as session:
        service = SellerService(session)
        res = await service.run_ai_catalog_deduplication()
        logger.info("AI Deduplication Scan completed: %s", res)

        count = res.get("new_duplicates_detected", 0)
        if count > 0:
            logger.info("Found %d new duplicate candidates. Alerting admin...", count)
            # Send email to Admin
            try:
                from modules.notifications.service import send_email
                subject = f"[ELEKTRIX Marketplace] {count} Duplicate Product(s) Detected for Review"
                body = (
                    f"Hello Admin,\n\n"
                    f"Our Nightly AI Catalog Auditor scanned the marketplace catalog and flagged "
                    f"{count} potential duplicate product listing(s).\n\n"
                    f"Please review and merge them at:\n"
                    f"{settings.storefront_url.replace(':3000', ':3001')}/catalog/duplicates\n\n"
                    f"— ELEKTRIX Automated Catalog Agent"
                )
                await send_email(
                    to="admin@elektrix.in",
                    subject=subject,
                    body=body,
                )
                logger.info("Email alert successfully sent to admin@elektrix.in")
            except Exception as e:
                logger.warning("Could not send email alert: %s", e)


if __name__ == "__main__":
    asyncio.run(main())
