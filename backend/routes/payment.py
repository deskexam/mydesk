from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timedelta
from core.database import get_db
from core.security import get_current_user
from core.config import settings

router = APIRouter(prefix="/api/payment", tags=["payment"])


class CreateOrderRequest(BaseModel):
    amount: int          # amount in paise (e.g. 20000 = ₹200)
    plan: str            # "monthly" or "yearly"


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str            # "monthly" or "yearly"


def _razorpay_client():
    import razorpay
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(
            status_code=503,
            detail="Razorpay keys not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env"
        )
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


@router.post("/create-order")
async def create_order(
    body: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a Razorpay order for a subscription purchase."""
    if body.plan not in ("monthly", "yearly"):
        raise HTTPException(status_code=400, detail="plan must be 'monthly' or 'yearly'")

    client = _razorpay_client()
    order = client.order.create({
        "amount": body.amount,
        "currency": "INR",
        "payment_capture": 1,
        "notes": {
            "plan": body.plan,
            "user_id": str(current_user["_id"]),
        },
    })
    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key": settings.razorpay_key_id,
    }


@router.post("/verify-payment")
async def verify_payment(
    body: VerifyPaymentRequest,
    current_user: dict = Depends(get_current_user),
):
    """Verify Razorpay payment signature and activate the subscription."""
    import hmac, hashlib

    if body.plan not in ("monthly", "yearly"):
        raise HTTPException(status_code=400, detail="plan must be 'monthly' or 'yearly'")

    # Verify HMAC signature
    expected = hmac.new(
        settings.razorpay_key_secret.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if expected != body.razorpay_signature:
        raise HTTPException(status_code=400, detail="Payment verification failed: invalid signature")

    # Activate subscription
    db = get_db()
    duration_days = 365 if body.plan == "yearly" else 30
    subscription_end = datetime.utcnow() + timedelta(days=duration_days)
    credits = 1000 if body.plan == "yearly" else 100
    amount = 2000 if body.plan == "yearly" else 200

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "subscription_status": body.plan,
            "subscription_end": subscription_end,
            "credits": credits,
        }},
    )

    await db.transactions.insert_one({
        "user_id": current_user["_id"],
        "type": "subscription",
        "plan": body.plan,
        "amount": amount,
        "razorpay_order_id": body.razorpay_order_id,
        "razorpay_payment_id": body.razorpay_payment_id,
        "description": f"{body.plan.capitalize()} subscription via Razorpay",
        "created_at": datetime.utcnow(),
    })

    return {
        "message": f"{body.plan.capitalize()} subscription activated",
        "subscription_end": subscription_end.isoformat(),
        "credits": credits,
    }
