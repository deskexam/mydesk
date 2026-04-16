"""
Email sending module — uses SMTP (Gmail or any provider).
Falls back to console logging if SMTP is not configured.
"""
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL    = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME     = os.getenv("FROM_NAME", "Deskexam")
SITE_URL      = os.getenv("SITE_URL", "https://deskexam.com")


def _send(to_email: str, subject: str, html: str) -> None:
    """Send an HTML email. Logs to console if SMTP not configured."""
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"[EMAIL] (SMTP not configured) To: {to_email} | Subject: {subject}", flush=True)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        print(f"[EMAIL] Sent '{subject}' → {to_email}", flush=True)
    except Exception as e:
        print(f"[EMAIL] Failed to send '{subject}' → {to_email}: {e}", flush=True)


# ── Templates ────────────────────────────────────────────────────────────────

def _base_template(content: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }}
  .wrap {{ max-width: 560px; margin: 32px auto; background: #fff; border-radius: 12px;
           box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }}
  .header {{ background: #1a365d; padding: 28px 32px; text-align: center; }}
  .header h1 {{ color: #fff; margin: 0; font-size: 22px; letter-spacing: 1px; }}
  .header p {{ color: #93c5fd; margin: 4px 0 0; font-size: 13px; }}
  .body {{ padding: 28px 32px; color: #1e293b; line-height: 1.6; }}
  .body h2 {{ color: #1a365d; margin-top: 0; }}
  .btn {{ display: inline-block; margin: 20px 0; padding: 12px 28px;
          background: #1a365d; color: #fff !important; text-decoration: none;
          border-radius: 8px; font-weight: 600; font-size: 15px; }}
  .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px;
            background: #dbeafe; color: #1e40af; font-size: 13px; font-weight: 600; }}
  .info-row {{ display: flex; justify-content: space-between; padding: 8px 0;
               border-bottom: 1px solid #f1f5f9; font-size: 14px; }}
  .info-row:last-child {{ border-bottom: none; }}
  .footer {{ background: #f8fafc; padding: 16px 32px; text-align: center;
             font-size: 12px; color: #94a3b8; }}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>DESKEXAM</h1>
    <p>AI-Powered Question Paper Creator</p>
  </div>
  <div class="body">{content}</div>
  <div class="footer">
    &copy; {datetime.now().year} Deskexam &nbsp;|&nbsp;
    <a href="{SITE_URL}" style="color:#64748b;">deskexam.com</a>
  </div>
</div>
</body></html>"""


# ── Public email functions ────────────────────────────────────────────────────

def send_welcome_email(to_email: str, full_name: str, trial_days: int = 15) -> None:
    first = full_name.split()[0] if full_name else "there"
    content = f"""
    <h2>Welcome to Deskexam, {first}! 🎉</h2>
    <p>Your account is ready. You're now on a <strong>{trial_days}-day free trial</strong>
    — enjoy full access to generate AI-powered question papers.</p>

    <div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:16px 0">
      <strong>What you can do:</strong>
      <ul style="margin:8px 0 0;padding-left:20px;">
        <li>Generate MCQ, short answer &amp; long answer papers</li>
        <li>Choose CBSE, ICSE or Maharashtra board</li>
        <li>Download papers as PDF or LaTeX</li>
        <li>Edit &amp; customize in the built-in editor</li>
      </ul>
    </div>

    <a href="{SITE_URL}/paper-generator" class="btn">Start Generating Papers →</a>

    <p style="font-size:13px;color:#64748b;margin-top:16px;">
      Your trial gives you <strong>10 papers</strong> free. After that, upgrade to a paid plan
      to continue. Questions? Reply to this email anytime.
    </p>
    """
    _send(to_email, "Welcome to Deskexam — Your account is ready!", _base_template(content))


def send_verification_email(to_email: str, token: str) -> None:
    verify_url = f"{SITE_URL}/auth?verify={token}"
    content = f"""
    <h2>Verify your email address</h2>
    <p>Click the button below to verify your email and activate your Deskexam account.</p>
    <a href="{verify_url}" class="btn">Verify Email</a>
    <p style="font-size:13px;color:#64748b;">
      Or copy this link: <a href="{verify_url}" style="color:#1a365d;">{verify_url}</a>
    </p>
    <p style="font-size:12px;color:#94a3b8;">If you didn't create an account, ignore this email.</p>
    """
    _send(to_email, "Verify your Deskexam email address", _base_template(content))


def send_reset_email(to_email: str, token: str) -> None:
    reset_url = f"{SITE_URL}/auth?reset={token}"
    content = f"""
    <h2>Reset your password</h2>
    <p>We received a request to reset your Deskexam password. Click below to set a new one.
    This link expires in <strong>1 hour</strong>.</p>
    <a href="{reset_url}" class="btn">Reset Password</a>
    <p style="font-size:13px;color:#64748b;">
      Or copy: <a href="{reset_url}" style="color:#1a365d;">{reset_url}</a>
    </p>
    <p style="font-size:12px;color:#94a3b8;">If you didn't request this, ignore this email — your password won't change.</p>
    """
    _send(to_email, "Reset your Deskexam password", _base_template(content))


def send_payment_confirmation_email(
    to_email: str, full_name: str, plan_label: str,
    amount: int, payment_id: str, expiry: str
) -> None:
    first = full_name.split()[0] if full_name else "there"
    content = f"""
    <h2>Payment Successful! ✅</h2>
    <p>Hi {first}, your <strong>{plan_label}</strong> plan is now active.</p>

    <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;">
      <div class="info-row"><span>Plan</span><span><span class="badge">{plan_label}</span></span></div>
      <div class="info-row"><span>Amount Paid</span><span><strong>₹{amount}</strong></span></div>
      <div class="info-row"><span>Payment ID</span><span style="font-size:12px;color:#64748b;">{payment_id}</span></div>
      <div class="info-row"><span>Valid Until</span><span><strong>{expiry}</strong></span></div>
    </div>

    <a href="{SITE_URL}/paper-generator" class="btn">Generate Papers Now →</a>

    <p style="font-size:13px;color:#64748b;margin-top:16px;">
      Keep this email as your payment receipt. For any billing queries, reply to this email.
    </p>
    """
    _send(
        to_email,
        f"Payment Confirmed — {plan_label} activated on Deskexam",
        _base_template(content)
    )
