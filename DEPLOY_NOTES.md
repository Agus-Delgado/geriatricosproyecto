# Notas de Despliegue

## Variables de Entorno Requeridas

### Cloudinary (Storage para Documentos de Residentes)

Para habilitar la funcionalidad de upload de documentos (carnet) para residentes, es necesario configurar las siguientes variables de entorno en Render (o tu plataforma de despliegue):

#### Variables Requeridas:
- `CLOUDINARY_CLOUD_NAME`: Nombre de la cuenta de Cloudinary
- `CLOUDINARY_API_KEY`: API Key de Cloudinary
- `CLOUDINARY_API_SECRET`: API Secret de Cloudinary

#### Variables Opcionales:
- `CLOUDINARY_FOLDER`: Carpeta en Cloudinary donde se guardarán los documentos (default: `"residents-docs"`)

### Cómo Obtener las Credenciales de Cloudinary

1. Crear una cuenta en [Cloudinary](https://cloudinary.com/)
2. Ir al Dashboard de Cloudinary
3. Copiar las credenciales desde la sección "Account Details":
   - Cloud Name
   - API Key
   - API Secret

### Configuración en Render

1. Ir al dashboard de Render
2. Seleccionar el servicio del backend (FastAPI)
3. Ir a la sección "Environment"
4. Agregar las siguientes variables:
   ```
   CLOUDINARY_CLOUD_NAME=tu-cloud-name
   CLOUDINARY_API_KEY=tu-api-key
   CLOUDINARY_API_SECRET=tu-api-secret
   CLOUDINARY_FOLDER=residents-docs  # Opcional
   ```
5. Guardar y redeplegar el servicio

### Validación

Después de configurar las variables de entorno, verificar que:
- El endpoint `POST /residents/{resident_id}/document` funciona correctamente
- Los documentos se suben a Cloudinary en la carpeta especificada
- Los documentos se pueden visualizar desde la URL retornada

### Notas Importantes

- **Seguridad**: Nunca commitees las credenciales de Cloudinary en el repositorio
- **Límites**: Cloudinary tiene límites de ancho de banda y almacenamiento según el plan
- **Tamaño de archivo**: El backend valida un tamaño máximo de 10MB por archivo
- **Formatos permitidos**: JPG, JPEG, PNG, PDF

### Solución de Problemas

Si el upload de documentos falla:
1. Verificar que todas las variables de entorno están configuradas correctamente
2. Verificar que las credenciales de Cloudinary son válidas
3. Revisar los logs del backend en Render para errores específicos
4. Verificar que el plan de Cloudinary permite las operaciones requeridas
