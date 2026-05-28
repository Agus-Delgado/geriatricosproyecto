from pydantic_settings import BaseSettings
from pydantic import AliasChoices, Field
from typing import List, Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # CORS (opcional - si no está definida usa defaults)
    CORS_ORIGINS: Optional[str] = None
    CORS_ORIGIN_REGEX: Optional[str] = None  # Regex para permitir orígenes (ej: "^https://.*\\.vercel\\.app$")
    CORS_ALLOW_CREDENTIALS: bool = True  # Permitir cookies/credentials
    
    # Storage
    STORAGE_PROVIDER: str = "local"
    STORAGE_BASE_URL: str = "http://localhost:8000/storage"
    
    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Bootstrap de Producción (opcional - solo si se quiere crear usuarios automáticamente)
    ADMIN_DNI: Optional[str] = None
    ADMIN_PASSWORD: Optional[str] = None
    ADMIN_EMAIL: Optional[str] = None
    ADMIN_FULL_NAME: str = "Platform Admin"
    
    MEDICO_DNI: Optional[str] = None
    MEDICO_PASSWORD: Optional[str] = None
    MEDICO_EMAIL: Optional[str] = None
    MEDICO_FULL_NAME: str = "Dr. Médico"
    
    # Email / SMTP
    FRONTEND_URL: str = "http://localhost:5173"  # URL del frontend (Vercel en producción)
    EMAIL_FROM: str = Field(
        default="Geriátricos <miconsultoriosoporte@gmail.com>",
        validation_alias=AliasChoices("EMAIL_FROM", "DEFAULT_FROM_EMAIL"),
    )
    SMTP_HOST: str = Field(
        default="smtp.gmail.com",
        validation_alias=AliasChoices("SMTP_HOST", "EMAIL_HOST"),
    )
    SMTP_PORT: int = Field(
        default=587,
        validation_alias=AliasChoices("SMTP_PORT", "EMAIL_PORT"),
    )
    SMTP_USER: str = Field(
        default="miconsultoriosoporte@gmail.com",
        validation_alias=AliasChoices("SMTP_USER", "EMAIL_HOST_USER"),
    )
    SMTP_PASSWORD: str = Field(
        default="",
        validation_alias=AliasChoices("SMTP_PASSWORD", "EMAIL_HOST_PASSWORD"),
    )
    SMTP_USE_TLS: bool = Field(
        default=True,
        validation_alias=AliasChoices("SMTP_USE_TLS", "EMAIL_USE_TLS"),
    )
    SMTP_USE_SSL: bool = Field(
        default=False,
        validation_alias=AliasChoices("SMTP_USE_SSL", "EMAIL_USE_SSL"),
    )
    EMAIL_VERIFY_TOKEN_TTL_HOURS: int = 24
    EMAIL_REPLY_TO: Optional[str] = None

    # Web Push (VAPID)
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_SUBJECT: str = "mailto:soporte@geriatricos.com"
    
    # Cloudinary (Storage para documentos)
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    CLOUDINARY_FOLDER: str = "residents-docs"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into list, con defaults para desarrollo si no está definida"""
        # Defaults para desarrollo local
        default_origins = ["http://localhost:5173", "http://localhost:4173"]
        
        # Si CORS_ORIGINS no está definida o está vacía, usar defaults
        if not self.CORS_ORIGINS or not self.CORS_ORIGINS.strip():
            return default_origins
        
        # Parsear la lista separada por comas
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        
        # Si después de parsear está vacía, usar defaults
        if not origins:
            return default_origins
        
        return origins
    
    @property
    def cors_origin_regex(self) -> Optional[str]:
        """Retorna el regex de CORS si está definido"""
        if not self.CORS_ORIGIN_REGEX or not self.CORS_ORIGIN_REGEX.strip():
            return None
        return self.CORS_ORIGIN_REGEX.strip()
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
