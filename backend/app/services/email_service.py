import asyncio
import contextlib
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.core.config import settings
from app.core.logging import logger


class EmailService:
    """Service for dispatching transactional email notifications via SMTP, Resend, or dev fallback."""

    def _build_mime_message(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
    ) -> MIMEMultipart:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        # Attach plain-text first, then HTML as alternative
        part_text = MIMEText(text_content, "plain", "utf-8")
        part_html = MIMEText(html_content, "html", "utf-8")
        msg.attach(part_text)
        msg.attach(part_html)
        return msg

    def _send_via_smtp_sync(
        self,
        msg: MIMEMultipart,
    ) -> None:
        """Synchronous SMTP delivery executed in threadpool."""
        if settings.SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)

        try:
            if not settings.SMTP_USE_SSL and settings.SMTP_USE_TLS:
                server.starttls()

            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

            server.send_message(msg)
        finally:
            with contextlib.suppress(Exception):
                server.quit()

    async def _send_via_resend(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
    ) -> bool:
        """Deliver email using Resend HTTP REST API."""
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "from": f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "text": text_content,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code >= 400:
                logger.error("resend_api_error", status_code=resp.status_code, body=resp.text)
                return False
            return True

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
    ) -> bool:
        """Send an email using configured provider (Resend > SMTP > Console mock)."""
        if not settings.EMAILS_ENABLED:
            logger.info("email_disabled_skipping", to=to_email, subject=subject)
            return True

        # 1. Resend API
        if settings.RESEND_API_KEY:
            try:
                success = await self._send_via_resend(to_email, subject, html_content, text_content)
                if success:
                    logger.info("email_sent_via_resend", to=to_email, subject=subject)
                    return True
            except Exception as exc:
                logger.error("resend_send_failed", to=to_email, error=str(exc))
                return False

        # 2. SMTP Transport
        if settings.SMTP_HOST:
            try:
                msg = self._build_mime_message(to_email, subject, html_content, text_content)
                await asyncio.to_thread(self._send_via_smtp_sync, msg)
                logger.info(
                    "email_sent_via_smtp", host=settings.SMTP_HOST, to=to_email, subject=subject
                )
                return True
            except Exception as exc:
                logger.error(
                    "smtp_send_failed", host=settings.SMTP_HOST, to=to_email, error=str(exc)
                )
                return False

        # 3. Development / Local Fallback (Logs email details so workflow succeeds)
        logger.info(
            "email_mock_delivered",
            to=to_email,
            subject=subject,
            notice="No SMTP_HOST or RESEND_API_KEY set. Configure SMTP in .env for real inbox delivery.",
        )
        return True

    async def send_workspace_invitation(
        self,
        to_email: str,
        workspace_name: str,
        inviter_email: str,
        role: str = "member",
        is_registered: bool = True,
    ) -> bool:
        """Send a workspace invitation email notification."""
        subject = f'You\'ve been invited to join "{workspace_name}" on DocuMind'
        action_url = (
            f"{settings.FRONTEND_URL}/login"
            if is_registered
            else f"{settings.FRONTEND_URL}/register"
        )

        status_text = (
            "Log in with this email to access the workspace from your workspace switcher."
            if is_registered
            else "Sign up with this email to automatically access this workspace."
        )

        button_label = "Open Workspace" if is_registered else "Accept & Create Account"

        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f4f4f5;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #18181b; letter-spacing: -0.5px;">DocuMind</span>
                    <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; font-size: 11px; font-weight: 600; color: #059669; background-color: #ecfdf5; border-radius: 9999px;">Workspace Invite</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #18181b; line-height: 1.3;">
                You've been invited to collaborate
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #52525b; line-height: 1.6;">
                <strong>{inviter_email}</strong> has invited you to join the <strong>{workspace_name}</strong> workspace as a <strong>{role}</strong>.
              </p>

              <!-- Workspace Card -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">Workspace</div>
                    <div style="font-size: 16px; font-weight: 700; color: #0f172a;">{workspace_name}</div>
                    <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Role: <span style="font-weight: 600; color: #334155;">{role}</span></div>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #000000;">
                    <a href="{action_url}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      {button_label} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5;">
                {status_text}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid #f4f4f5; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                DocuMind &middot; Private, verifiable document intelligence & chat
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_content = f"""DocuMind - Workspace Invitation

You've been invited to collaborate!

{inviter_email} has invited you to join the workspace "{workspace_name}" on DocuMind with the role "{role}".

To access this workspace:
{action_url}

{status_text}
"""
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )


email_service = EmailService()
