"""
Services Layer - Email Service
SMTP 寄信服務（驗證信、密碼重設信）
"""
import os
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "SELf-Corner")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")


async def _send_email(to_email: str, subject: str, html_body: str):
    """底層 SMTP 寄信函數"""
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    await aiosmtplib.send(
        msg,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        start_tls=True,
        username=SMTP_USER,
        password=SMTP_PASSWORD,
    )


async def send_verification_email(to_email: str, token: str):
    """寄出 Email 驗證信"""
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>歡迎加入 SELf-Corner！</h2>
        <p>請點擊下方按鈕驗證您的電子信箱：</p>
        <a href="{verify_url}"
           style="display:inline-block; padding:12px 24px;
                  background:#D97756; color:#fff; text-decoration:none;
                  border-radius:8px; margin:16px 0;">
            驗證信箱
        </a>
        <p style="color:#888; font-size:13px;">
            此連結將於 24 小時後失效。若非本人操作，請忽略此信。
        </p>
    </div>
    """
    await _send_email(to_email, "SELf-Corner — 驗證您的電子信箱", html)


async def send_password_reset_email(to_email: str, token: str):
    """寄出密碼重設信"""
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>重設您的密碼</h2>
        <p>我們收到了密碼重設的請求，請點擊下方按鈕設定新密碼：</p>
        <a href="{reset_url}"
           style="display:inline-block; padding:12px 24px;
                  background:#D97756; color:#fff; text-decoration:none;
                  border-radius:8px; margin:16px 0;">
            重設密碼
        </a>
        <p style="color:#888; font-size:13px;">
            此連結將於 1 小時後失效。若非本人操作，請忽略此信。
        </p>
    </div>
    """
    await _send_email(to_email, "SELf-Corner — 重設密碼", html)