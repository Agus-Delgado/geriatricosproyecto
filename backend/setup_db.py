"""
Script para configurar la base de datos
"""
import sys
import os

# Agregar el directorio actual al path
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def setup_database():
    """Crear base de datos si no existe"""
    try:
        # Conectar a PostgreSQL (base de datos 'postgres')
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password="postgres",
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Verificar si la base de datos existe
        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'geriatricos_db'")
        exists = cur.fetchone()
        
        if not exists:
            print("Creando base de datos 'geriatricos_db'...")
            cur.execute('CREATE DATABASE geriatricos_db')
            print("✓ Base de datos creada exitosamente")
        else:
            print("✓ La base de datos 'geriatricos_db' ya existe")
        
        cur.close()
        conn.close()
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Error de conexión a PostgreSQL: {e}")
        print("\nPor favor verifica que:")
        print("1. PostgreSQL esté instalado y corriendo")
        print("2. Las credenciales en .env sean correctas (usuario: postgres, password: postgres)")
        print("3. El puerto 5432 esté disponible")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

if __name__ == "__main__":
    print("Configurando base de datos...")
    if setup_database():
        print("\n✅ Base de datos configurada. Puedes ejecutar las migraciones ahora:")
        print("   python -m alembic upgrade head")
    else:
        sys.exit(1)
