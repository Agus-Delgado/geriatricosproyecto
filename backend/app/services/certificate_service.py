from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from io import BytesIO
import uuid
from datetime import datetime
from typing import Dict, Any
from app.core.config import settings


def generate_certificate_pdf(
    certificate_type: str,
    resident_name: str,
    content_json: Dict[str, Any],
    issued_at: datetime
) -> tuple[BytesIO, str]:
    """Generar PDF del certificado y retornar buffer + URL placeholder"""
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Título según tipo
    type_titles = {
        "SURVIVAL": "CERTIFICADO DE SUPERVIVENCIA",
        "DOMICILE": "CERTIFICADO DE DOMICILIO",
        "DEATH": "CERTIFICADO DE ÓBITO"
    }
    title = type_titles.get(certificate_type, "CERTIFICADO")
    
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 0.3 * inch))
    
    # Contenido del certificado
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=12,
        leading=16,
        alignment=TA_LEFT
    )
    
    # Información del residente
    story.append(Paragraph(f"<b>Residente:</b> {resident_name}", body_style))
    story.append(Spacer(1, 0.2 * inch))
    
    # Campos variables desde content_json
    for key, value in content_json.items():
        if value:
            story.append(Paragraph(f"<b>{key.replace('_', ' ').title()}:</b> {value}", body_style))
            story.append(Spacer(1, 0.1 * inch))
    
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph(f"<b>Fecha de emisión:</b> {issued_at.strftime('%d/%m/%Y %H:%M')}", body_style))
    
    # Construir PDF
    doc.build(story)
    buffer.seek(0)
    
    # Generar URL placeholder (en producción sería S3/R2/Cloudinary)
    pdf_filename = f"certificate_{certificate_type.lower()}_{uuid.uuid4().hex[:8]}.pdf"
    pdf_url = f"{settings.STORAGE_BASE_URL}/{pdf_filename}"
    
    return buffer, pdf_url


def generate_clinical_history_pdf(
    resident_name: str,
    resident_dni: str | None,
    coverage: str | None,
    notes: list[dict],
    issued_at: datetime
) -> BytesIO:
    """Generar PDF de Historia Clínica (Evoluciones)"""
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []
    
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    title_style = ParagraphStyle(
        'HistoryTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#333333'),
        spaceAfter=10
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=12,
        spaceBefore=10,
        fontName='Helvetica-Bold'
    )
    
    note_date_style = ParagraphStyle(
        'NoteDate',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#555555'),
        fontName='Helvetica-Bold'
    )
    
    note_content_style = ParagraphStyle(
        'NoteContent',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#333333')
    )
    
    # Título
    story.append(Paragraph("HISTORIA CLÍNICA — EVOLUCIONES", title_style))
    story.append(Spacer(1, 0.2 * inch))
    
    # Información del residente
    story.append(Paragraph(f"<b>Paciente:</b> {resident_name}", header_style))
    if resident_dni:
        story.append(Paragraph(f"<b>DNI:</b> {resident_dni}", header_style))
    if coverage:
        story.append(Paragraph(f"<b>Obra Social:</b> {coverage}", header_style))
    
    story.append(Paragraph(f"<b>Fecha de generación:</b> {issued_at.strftime('%d/%m/%Y %H:%M')}", header_style))
    story.append(Spacer(1, 0.3 * inch))
    
    # Sección de evoluciones
    story.append(Paragraph("Evoluciones", section_title_style))
    story.append(Spacer(1, 0.1 * inch))
    
    if not notes:
        story.append(Paragraph("<i>Sin evoluciones registradas</i>", note_content_style))
    else:
        for idx, note in enumerate(notes):
            # Fecha y hora
            recorded_at = note.get("recorded_at")
            if isinstance(recorded_at, datetime):
                date_str = recorded_at.strftime("%d/%m/%Y %H:%M")
            else:
                date_str = "Fecha no disponible"
            
            note_type = note.get("note_type", "GENERAL")
            content = note.get("content", "")
            
            # Tipo de nota en español
            type_map = {
                "EVOLUTION": "Evolución",
                "INCIDENT": "Incidente",
                "GENERAL": "Nota General"
            }
            type_label = type_map.get(note_type, note_type)
            
            # Crear tabla para cada nota (para bordes y formato)
            note_data = [
                [Paragraph(f"<b>{date_str}</b> — {type_label}", note_date_style)],
                [Paragraph(content.replace('\n', '<br/>'), note_content_style)]
            ]
            
            note_table = Table(note_data, colWidths=[6.5*inch])
            note_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f5f5f5')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
                ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#cccccc'))
            ]))
            
            story.append(note_table)
            
            # Espacio entre notas (excepto la última)
            if idx < len(notes) - 1:
                story.append(Spacer(1, 0.15 * inch))
    
    # Construir PDF
    doc.build(story)
    buffer.seek(0)
    
    return buffer
