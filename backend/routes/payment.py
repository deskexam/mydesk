from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime, timedelta
from core.database import get_db
from core.security import get_current_user
from core.config import settings

router = APIRouter(prefix="/api/payment", tags=["payment"])

# Plan config: amount in paise, duration days, plan key
PLAN_CONFIG = {
    "basic":  {"amount": 29900,  "days": 30,  "label": "Basic Professional"},
    "pro":    {"amount": 59900,  "days": 30,  "label": "Pro Institute"},
    "yearly": {"amount": 600000, "days": 365, "label": "Yearly Pro"},
}


class CreateOrderRequest(BaseModel):
    plan: str  # basic | pro | yearly


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str


def _razorpay_client():
    import razorpay
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(status_code=503, detail="Razorpay not configured")
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


@router.post("/create-order")
async def create_order(
    body: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
):
    if body.plan not in PLAN_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid plan. Choose: basic, pro, yearly")

    plan = PLAN_CONFIG[body.plan]
    client = _razorpay_client()
    order = client.order.create({
        "amount": plan["amount"],
        "currency": "INR",
        "payment_capture": 1,
        "notes": {"plan": body.plan, "user_id": str(current_user["_id"])},
    })
    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key": settings.razorpay_key_id,
        "plan": body.plan,
        "plan_label": plan["label"],
    }


@router.post("/verify-payment")
async def verify_payment(
    body: VerifyPaymentRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    import hmac, hashlib

    if body.plan not in PLAN_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid plan")

    # Verify HMAC signature
    expected = hmac.new(
        settings.razorpay_key_secret.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if expected != body.razorpay_signature:
        raise HTTPException(status_code=400, detail="Payment verification failed: invalid signature")

    plan_cfg = PLAN_CONFIG[body.plan]
    now = datetime.utcnow()
    subscription_end = now + timedelta(days=plan_cfg["days"])

    db = get_db()
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "plan": body.plan,
            "trial_active": False,
            "subscription_start": now,
            "subscription_end": subscription_end,
            "last_reset_date": now,
            "papers_used": 0,
            "downloads_used": 0,
            # Legacy
            "subscription_status": body.plan,
            "updated_at": now,
        }},
    )

    await db.transactions.insert_one({
        "user_id": current_user["_id"],
        "type": "subscription",
        "plan": body.plan,
        "amount": plan_cfg["amount"] // 100,
        "razorpay_order_id": body.razorpay_order_id,
        "razorpay_payment_id": body.razorpay_payment_id,
        "description": f"{plan_cfg['label']} subscription via Razorpay",
        "created_at": now,
    })

    # Send payment confirmation email
    from core.email import send_payment_confirmation_email
    expiry_str = subscription_end.strftime("%d %b %Y")
    background_tasks.add_task(
        send_payment_confirmation_email,
        current_user["email"],
        current_user.get("full_name", current_user.get("name", "")),
        plan_cfg["label"],
        plan_cfg["amount"] // 100,
        body.razorpay_payment_id,
        expiry_str,
    )

    return {
        "message": f"{plan_cfg['label']} activated successfully",
        "plan": body.plan,
        "subscription_end": subscription_end.isoformat(),
    }


@router.get("/plans")
async def get_plans():
    """Return available plans and pricing for frontend."""
    return {
        "plans": [
            {
                "key": "basic",
                "label": "Basic Professional",
                "price": 299,
                "amount_paise": 29900,
                "period": "month",
                "papers": 50,
                "downloads": 25,
                "grades": "8th - 12th",
                "branding": "No Watermark",
            },
            {
                "key": "pro",
                "label": "Pro Institute",
                "price": 599,
                "amount_paise": 59900,
                "period": "month",
                "papers": 100,
                "downloads": 50,
                "grades": "8th - 12th",
                "branding": "Custom Logo",
            },
            {
                "key": "yearly",
                "label": "Yearly Pro",
                "price": 6000,
                "amount_paise": 600000,
                "period": "year",
                "papers": 1000,
                "downloads": 500,
                "grades": "8th - 12th",
                "branding": "Custom Logo",
            },
        ]
    }
