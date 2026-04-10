import uuid
import logging
from datetime import datetime, timezone
from services.database import db
from services.constants import EMAIL_TEMPLATES

logger = logging.getLogger(__name__)


async def queue_email(template_id: str, to_email: str, user_name: str, user_id: str):
    """Queue/send an automated email (mock - stores in DB, ready for real service)"""
    template = EMAIL_TEMPLATES.get(template_id)
    if not template:
        return

    email_record = {
        "email_id": str(uuid.uuid4()),
        "template_id": template_id,
        "user_id": user_id,
        "to_email": to_email,
        "user_name": user_name,
        "subject": template["subject"],
        "trigger": template["trigger"],
        "status": "queued",
        "queued_at": datetime.now(timezone.utc).isoformat(),
        "sent_at": None,
        "auto": True,
    }
    await db.sent_emails.insert_one(email_record)
    logger.info(f"[EMAIL AUTO] {template_id} queued for {to_email} ({user_name})")

    # In production, this would call SendGrid/Mailgun here
    # For now, mark as "sent" immediately (simulation)
    await db.sent_emails.update_one(
        {"email_id": email_record["email_id"]},
        {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat()}}
    )
    logger.info(f"[EMAIL AUTO] {template_id} sent to {to_email}")


async def check_upsell_email(user_id: str, user_doc: dict):
    """Check if upsell email should be sent to returning free user"""
    if user_doc.get("subscription_tier") not in ["free", None]:
        return

    created_at = user_doc.get("created_at")
    if not created_at:
        return

    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

    days_since = (datetime.now(timezone.utc) - created_at).days
    if days_since < 3:
        return

    existing = await db.sent_emails.find_one({
        "user_id": user_id,
        "template_id": "upsell",
        "auto": True
    })
    if existing:
        return

    email = user_doc.get("email")
    name = user_doc.get("name", "Utente")
    if email:
        await queue_email("upsell", email, name, user_id)
