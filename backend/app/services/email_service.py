import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid
from typing import Tuple
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, text_body: str, html_body: str) -> None:
    """
    Enviar email usando SMTP (Gmail).
    
    Args:
        to: Dirección de email del destinatario
        subject: Asunto del email
        text_body: Cuerpo en texto plano
        html_body: Cuerpo en HTML
        
    Raises:
        Exception: Si falla el envío (se loguea sin exponer secrets)
    """
    try:
        # Crear mensaje multipart
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        
        # Parsear EMAIL_FROM (puede ser "Name <email>" o solo "email")
        if '<' in settings.EMAIL_FROM:
            parts = settings.EMAIL_FROM.split('<')
            from_name = parts[0].strip()
            from_email = parts[1].replace('>', '').strip()
            msg['From'] = formataddr((from_name, from_email))
        else:
            msg['From'] = settings.EMAIL_FROM
        
        msg['To'] = to
        msg['Message-ID'] = make_msgid()
        
        if settings.EMAIL_REPLY_TO:
            msg['Reply-To'] = settings.EMAIL_REPLY_TO
        
        # Agregar partes del mensaje (texto plano y HTML)
        part1 = MIMEText(text_body, 'plain', 'utf-8')
        part2 = MIMEText(html_body, 'html', 'utf-8')
        
        msg.attach(part1)
        msg.attach(part2)
        
        # Conectar al servidor SMTP
        if settings.SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        
        server.ehlo()
        
        if settings.SMTP_USE_TLS:
            server.starttls()
            server.ehlo()
        
        # Login (usar App Password de Gmail)
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        
        # Enviar email
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Email enviado exitosamente a {to} (subject: {subject})")
        
    except Exception as e:
        # Loguear error sin exponer credenciales
        logger.error(f"Error al enviar email a {to}: {str(e)}", exc_info=True)
        raise


def render_verification_email(verify_url: str) -> Tuple[str, str]:
    """
    Generar plantilla de email de verificación.
    
    Args:
        verify_url: URL completa de verificación (incluye token)
        
    Returns:
        Tuple con (text_body, html_body)
    """
    text_body = f"""Para verificar tu email, abrí este enlace:

{verify_url}

Este enlace expira en 24 horas. Si no solicitaste esta cuenta, ignorá este mensaje.
"""
    
    html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificá tu email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Verificá tu email</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hola,</p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">
            Para completar tu registro, necesitás verificar tu dirección de email.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verify_url}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 5px; font-weight: bold; font-size: 16px;">
                Verificar email
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            O copiá y pegá este enlace en tu navegador:<br>
            <a href="{verify_url}" style="color: #667eea; word-break: break-all;">{verify_url}</a>
        </p>
        
        <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
            <p style="font-size: 14px; margin: 0; color: #856404;">
                <strong>Importante:</strong> Este enlace expira en 24 horas. Si no solicitaste esta cuenta, ignorá este mensaje.
            </p>
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-left: 4px solid #2196F3; border-radius: 4px;">
            <p style="font-size: 14px; margin: 0; color: #0c5460;">
                <strong>Tip:</strong> Si no aparece en tu bandeja de entrada en 2-3 minutos, revisá la carpeta de Spam o Promociones.
            </p>
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
        <p>Geriátricos - Sistema de Gestión</p>
    </div>
</body>
</html>
"""
    
    return text_body, html_body


def render_password_reset_email(reset_url: str, user_name: str, expiry_minutes: int = 60) -> Tuple[str, str]:
    """
    Generar plantilla de email de restablecimiento de contraseña.
    
    Args:
        reset_url: URL completa de restablecimiento (incluye token)
        user_name: Nombre del usuario
        expiry_minutes: Minutos de validez del token (default: 60)
        
    Returns:
        Tuple con (text_body, html_body)
    """
    text_body = f"""Hola, {user_name}:

Recibimos una solicitud para restablecer la contraseña de tu cuenta en la Plataforma Geriátricos.

Para restablecer tu contraseña, abrí este enlace:

{reset_url}

Este enlace es válido por {expiry_minutes} minutos.

Si no solicitaste este cambio, ignorá este mensaje. Tu contraseña no se modificará.

Saludos,
Equipo de Soporte – Plataforma Geriátricos
"""
    
    html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecimiento de contraseña</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Restablecimiento de contraseña</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hola, {user_name}:</p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en la Plataforma Geriátricos.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 5px; font-weight: bold; font-size: 16px;">
                Restablecer contraseña
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            O copiá y pegá este enlace en tu navegador:<br>
            <a href="{reset_url}" style="color: #667eea; word-break: break-all;">{reset_url}</a>
        </p>
        
        <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
            <p style="font-size: 14px; margin: 0; color: #856404;">
                <strong>Importante:</strong> Este enlace es válido por {expiry_minutes} minutos. Si no solicitaste este cambio, ignorá este mensaje. Tu contraseña no se modificará.
            </p>
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-left: 4px solid #2196F3; border-radius: 4px;">
            <p style="font-size: 14px; margin: 0; color: #0c5460;">
                <strong>Tip:</strong> Si no aparece en tu bandeja de entrada en 2-3 minutos, revisá la carpeta de Spam o Promociones.
            </p>
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
        <p>Equipo de Soporte – Plataforma Geriátricos</p>
    </div>
</body>
</html>
"""
    
    return text_body, html_body
