from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.auth import User
from app.core.config import settings
from app.services.email_service import send_email
from app.schemas.support import BugReportRequest, BugReportResponse

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/bug-report", response_model=BugReportResponse, status_code=status.HTTP_200_OK)
async def bug_report_endpoint(
    payload: BugReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    to_email = settings.SMTP_USER

    subject = "Reporte de error – Plataforma Geriátricos"

    user_email = current_user.email or "(sin email)"

    text_body = (
        "Se recibió un reporte de error.\n\n"
        f"Usuario: {current_user.full_name} ({user_email})\n"
        f"User ID: {current_user.id}\n"
        f"Facility ID: {payload.facility_id or '(no informado)'}\n"
        f"Ruta: {payload.path or '(no informado)'}\n"
        f"Build ID: {payload.build_id or '(no informado)'}\n"
        f"Build Time: {payload.build_time or '(no informado)'}\n"
        f"User-Agent: {payload.user_agent or '(no informado)'}\n\n"
        "Mensaje:\n"
        f"{payload.message}\n"
    )

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>Reporte de error</title>
</head>
<body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 720px; margin: 0 auto; padding: 20px;\">
  <div style=\"background: linear-gradient(135deg, #111827 0%, #334155 100%); padding: 20px; border-radius: 10px 10px 0 0;\">
    <h1 style=\"color: white; margin: 0; font-size: 18px;\">Reporte de error</h1>
    <p style=\"color: rgba(255,255,255,0.9); margin: 6px 0 0 0; font-size: 13px;\">Plataforma Geriátricos</p>
  </div>

  <div style=\"background: #f9fafb; padding: 18px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;\">
    <table style=\"width: 100%; border-collapse: collapse; font-size: 14px;\">
      <tr><td style=\"padding: 6px 0; color:#6b7280; width: 140px;\">Usuario</td><td style=\"padding: 6px 0;\"><strong>{current_user.full_name}</strong></td></tr>
      <tr><td style=\"padding: 6px 0; color:#6b7280;\">Email</td><td style=\"padding: 6px 0;\">{user_email}</td></tr>
      <tr><td style=\"padding: 6px 0; color:#6b7280;\">User ID</td><td style=\"padding: 6px 0;\">{current_user.id}</td></tr>
      <tr><td style=\"padding: 6px 0; color:#6b7280;\">Facility ID</td><td style=\"padding: 6px 0;\">{payload.facility_id or '(no informado)'}</td></tr>
      <tr><td style=\"padding: 6px 0; color:#6b7280;\">Ruta</td><td style=\"padding: 6px 0;\">{payload.path or '(no informado)'}</td></tr>
      <tr><td style=\"padding: 6px 0; color:#6b7280;\">Build ID</td><td style=\"padding: 6px 0;\">{payload.build_id or '(no informado)'}</td></tr>
      <tr><td style=\"padding: 6px 0; color:#6b7280;\">Build Time</td><td style=\"padding: 6px 0;\">{payload.build_time or '(no informado)'}</td></tr>
    </table>

    <div style=\"margin-top: 14px;\">
      <div style=\"font-size: 13px; color:#6b7280; margin-bottom: 6px;\">Mensaje</div>
      <div style=\"background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; white-space: pre-wrap;\">{payload.message}</div>
    </div>

    <div style=\"margin-top: 14px;\">
      <div style=\"font-size: 13px; color:#6b7280; margin-bottom: 6px;\">User-Agent</div>
      <div style=\"background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; font-size: 12px; color: #334155; word-break: break-word;\">{payload.user_agent or '(no informado)'}</div>
    </div>
  </div>
</body>
</html>"""

    send_email(
        to=to_email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )

    return BugReportResponse(message="Reporte enviado. ¡Gracias!")
