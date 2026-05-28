import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, status
from app.core.config import settings
from typing import Tuple
import logging

logger = logging.getLogger(__name__)

# Configurar Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


def upload_document(file_content: bytes, filename: str, mime_type: str, folder: str = None) -> Tuple[str, str, int]:
    """
    Subir documento a Cloudinary
    
    Args:
        file_content: Contenido del archivo en bytes
        filename: Nombre del archivo
        mime_type: Tipo MIME del archivo
        folder: Carpeta en Cloudinary (opcional)
    
    Returns:
        Tuple[document_url, document_name, document_size]
    
    Raises:
        HTTPException: Si Cloudinary no está configurado o hay error en la subida
    """
    # Validar que Cloudinary esté configurado
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY or not settings.CLOUDINARY_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary no está configurado. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET."
        )
    
    # Validar MIME type
    allowed_mimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if mime_type not in allowed_mimes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido. Tipos permitidos: {', '.join(allowed_mimes)}"
        )
    
    # Validar tamaño (10MB máximo)
    max_size = 10 * 1024 * 1024  # 10MB
    file_size = len(file_content)
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El archivo es demasiado grande. Tamaño máximo: 10MB. Tamaño actual: {file_size / (1024 * 1024):.2f}MB"
        )
    
    try:
        # Determinar resource_type según MIME type
        resource_type = "auto"  # Cloudinary detecta automáticamente
        if mime_type.startswith('image/'):
            resource_type = "image"
        elif mime_type == 'application/pdf':
            resource_type = "raw"
        
        # Configurar carpeta
        upload_folder = folder or settings.CLOUDINARY_FOLDER
        
        # Subir a Cloudinary
        upload_result = cloudinary.uploader.upload(
            file_content,
            resource_type=resource_type,
            folder=upload_folder,
            public_id=filename.rsplit('.', 1)[0] if '.' in filename else filename,
            overwrite=True,
            invalidate=True,
        )
        
        document_url = upload_result.get('secure_url') or upload_result.get('url')
        document_name = filename
        document_size = file_size
        
        logger.info(f"Documento subido exitosamente a Cloudinary: {document_url}")
        
        return document_url, document_name, document_size
        
    except Exception as e:
        logger.error(f"Error al subir documento a Cloudinary: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al subir documento: {str(e)}"
        )


def delete_document(document_url: str) -> None:
    """
    Eliminar documento de Cloudinary
    
    Args:
        document_url: URL del documento en Cloudinary
    """
    try:
        # Extraer public_id de la URL
        # Formato: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{format}
        parts = document_url.split('/')
        if len(parts) >= 8 and parts[2] == f'res.cloudinary.com':
            # Extraer public_id completo
            resource_type_index = parts.index('upload') if 'upload' in parts else parts.index('raw') if 'raw' in parts else None
            if resource_type_index and resource_type_index + 1 < len(parts):
                public_id_with_version = '/'.join(parts[resource_type_index + 2:])
                # Remover extensión
                public_id = public_id_with_version.rsplit('.', 1)[0]
                
                # Determinar resource_type
                resource_type = "raw" if 'raw' in parts else "image"
                
                cloudinary.uploader.destroy(public_id, resource_type=resource_type, invalidate=True)
                logger.info(f"Documento eliminado de Cloudinary: {public_id}")
    except Exception as e:
        logger.warning(f"Error al eliminar documento de Cloudinary (no crítico): {str(e)}")
