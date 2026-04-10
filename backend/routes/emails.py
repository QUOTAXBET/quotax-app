from fastapi import APIRouter, HTTPException, Request
import uuid
from datetime import datetime, timezone
from services.database import db
from services.constants import EMAIL_TEMPLATES

router = APIRouter()


@router.get("/emails/templates")
async def get_email_templates():
    return {"templates": list(EMAIL_TEMPLATES.values())}


@router.get("/emails/template/{template_id}")
async def get_email_template(template_id: str):
    template = EMAIL_TEMPLATES.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return {"template": template}


@router.post("/emails/send-test")
async def send_test_email(request: Request):
    body = await request.json()
    template_id = body.get("template_id", "welcome")
    to_email = body.get("email", "test@example.com")
    template = EMAIL_TEMPLATES.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato")
    email_record = {
        "email_id": str(uuid.uuid4()),
        "template_id": template_id, "to_email": to_email,
        "subject": template["subject"], "status": "sent",
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sent_emails.insert_one(email_record)
    return {"success": True, "message": f"Email '{template['subject']}' inviata a {to_email} (simulazione)", "email_id": email_record["email_id"]}


@router.get("/emails/history")
async def get_email_history(limit: int = 20):
    cursor = db.sent_emails.find({}, {"_id": 0}).sort("sent_at", -1).limit(limit)
    emails = await cursor.to_list(length=limit)
    return {"emails": emails, "count": len(emails)}


@router.get("/emails/queue")
async def get_email_queue():
    cursor = db.sent_emails.find({"auto": True}, {"_id": 0}).sort("queued_at", -1).limit(50)
    emails = await cursor.to_list(length=50)
    stats = {
        "total_sent": await db.sent_emails.count_documents({"auto": True, "status": "sent"}),
        "total_queued": await db.sent_emails.count_documents({"auto": True, "status": "queued"}),
        "welcome_sent": await db.sent_emails.count_documents({"auto": True, "template_id": "welcome"}),
        "upsell_sent": await db.sent_emails.count_documents({"auto": True, "template_id": "upsell"}),
        "reminder_sent": await db.sent_emails.count_documents({"auto": True, "template_id": "reminder"}),
        "elite_sent": await db.sent_emails.count_documents({"auto": True, "template_id": "elite"}),
    }
    return {"emails": emails, "stats": stats}
