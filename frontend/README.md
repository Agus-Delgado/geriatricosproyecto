# Frontend PWA - Hogares App

Aplicación móvil Progressive Web App (PWA) para la gestión de hogares, desarrollada con React, TypeScript, Vite y Tailwind CSS.

## Características

- **Mobile-First Design**: Diseño optimizado para dispositivos móviles
- **PWA**: Instalable como aplicación nativa
- **Autenticación JWT**: Sistema de autenticación seguro
- **Multi-sede**: Soporte para múltiples facilities
- **Role-Based Access Control**: Control de acceso basado en roles (OWNER, DOCTOR)
- **Funcionalidades principales**:
  - Gestión de residentes
  - Notas clínicas
  - Planes de medicación y administraciones
  - Contactos de emergencia
  - Finanzas (solo para OWNER)
  - Medicaciones pendientes del día

## Requisitos Previos

- Node.js 18+ y npm (o yarn/pnpm)
- Backend FastAPI corriendo (por defecto en `http://localhost:8000`)

## Instalación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   ```
   
   Editar `.env` y configurar:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Verificar CORS en el backend**:
   Asegúrate de que el backend tenga configurado CORS para permitir `http://localhost:5173` (ya incluido por defecto en `backend/app/core/config.py`).

## Desarrollo

**Iniciar servidor de desarrollo**:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

**Build para producción**:
```bash
npm run build
```

Los archivos compilados estarán en `dist/`.

**Preview del build de producción**:
```bash
npm run preview
```

## Estructura del Proyecto

```
frontend/
├── public/              # Archivos estáticos y PWA
│   ├── icons/          # Iconos PWA (192x192, 512x512)
│   └── manifest.json    # Manifest PWA
├── src/
│   ├── api/            # Cliente HTTP y servicios API
│   ├── components/      # Componentes React
│   │   ├── auth/       # Componentes de autenticación
│   │   ├── forms/      # Formularios
│   │   ├── layout/     # Layout y navegación
│   │   ├── resident/   # Componentes de residentes
│   │   └── ui/         # Componentes UI reutilizables
│   ├── contexts/       # Context API (Auth, Facility)
│   ├── pages/          # Páginas/rutas
│   ├── types/          # TypeScript types
│   ├── utils/          # Utilidades
│   ├── App.tsx         # Componente principal
│   ├── main.tsx        # Entry point
│   └── index.css       # Estilos globales
├── .env.example        # Ejemplo de variables de entorno
├── index.html          # HTML principal
├── package.json        # Dependencias y scripts
├── tsconfig.json       # Configuración TypeScript
├── vite.config.ts      # Configuración Vite y PWA
└── tailwind.config.js  # Configuración Tailwind CSS
```

## Rutas

- `/login` - Página de inicio de sesión
- `/select-facility` - Selección de sede
- `/residents` - Lista de residentes
- `/residents/:id` - Detalle de residente (con tabs)
- `/medication-due` - Medicaciones pendientes del día
- `/finance` - Finanzas (solo OWNER)

## Autenticación

El token JWT se almacena en `localStorage` y se incluye automáticamente en todas las peticiones mediante el cliente HTTP (`src/api/client.ts`).

## PWA

La aplicación está configurada como PWA usando `vite-plugin-pwa`. Para que funcione completamente:

1. **Iconos**: Los iconos están ubicados en `public/`:
   - `pwa-192.png` (192x192px)
   - `pwa-512.png` (512x512px)
   - `pwa-512-maskable.png` (512x512px, maskable)

2. **Service Worker**: Se genera automáticamente durante el build y se registra con auto-update.

3. **Instalación**: Los usuarios pueden instalar la app desde el navegador (menú "Agregar a pantalla de inicio").

### Verificación de PWA

**Importante**: En modo desarrollo (`npm run dev`), el prompt de instalación puede no aparecer siempre. Para probar la instalación completa de la PWA:

1. **Build y Preview**:
   ```bash
   npm run build
   npm run preview
   ```

2. **Abrir en el navegador**:
   - Abre `http://localhost:4173` (o el puerto que indique preview) en Chrome o Edge
   - En Android, usa Chrome y abre la URL desde tu máquina local o servidor

3. **Verificar instalación**:
   - Busca el icono de instalación en la barra de direcciones (Chrome/Edge)
   - O ve al menú del navegador y busca "Instalar aplicación" / "Add to Home Screen"
   - La aplicación debería instalarse como una app standalone

4. **Verificaciones adicionales en DevTools**:
   - **Service Worker**: Abre DevTools > Application > Service Workers
     - Debe mostrar el service worker registrado y activo
     - Estado: "activated and is running"
   - **Manifest**: Abre DevTools > Application > Manifest
     - Verifica que el manifest se carga correctamente
     - Revisa que los iconos estén listados y accesibles
     - Verifica que `theme_color` sea `#1d4ed8`
   - **Iconos**: Verifica que los iconos se carguen correctamente en la pestaña Manifest

## Deploy en Vercel

Para hacer deploy del frontend en Vercel:

### Configuración Inicial

1. **Conectar repositorio a Vercel**:
   - Ve a [vercel.com](https://vercel.com) e inicia sesión
   - Haz clic en "Add New Project"
   - Conecta tu repositorio de GitHub/GitLab/Bitbucket

2. **Configurar proyecto**:
   - **Framework Preset**: Vite (detectado automáticamente)
   - **Root Directory**: `frontend` (importante: selecciona el subdirectorio frontend)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Variables de entorno**:
   - En la configuración del proyecto en Vercel, ve a "Environment Variables"
   - Agrega la variable:
     ```
     VITE_API_BASE_URL=https://tu-backend-url.com
     ```
   - Reemplaza `https://tu-backend-url.com` con la URL de tu backend en producción
   - Asegúrate de agregarla tanto para **Production** como para **Preview** si aplica
   - **Importante**: Vite solo expone variables que comienzan con `VITE_` al código del frontend

4. **Deploy**:
   - Haz clic en "Deploy"
   - Vercel detectará automáticamente `vercel.json` y usará la configuración de rewrite SPA

### Configuración de vercel.json

El archivo `vercel.json` está configurado con:
- **Rewrites SPA**: Todas las rutas se redirigen a `index.html` para que React Router funcione correctamente en una Single Page Application

Esta configuración es esencial para que las rutas del frontend (como `/residents`, `/login`, etc.) funcionen correctamente al recargar la página o acceder directamente a ellas.

### Verificación Post-Deploy

1. **Verificar que la app carga correctamente**
2. **Verificar que las rutas funcionan** (ej: `/residents`, `/login`)
3. **Verificar que las llamadas API funcionan** (revisar la consola del navegador)
4. **Verificar CORS en el backend**: Asegúrate de que tu backend permita el origen de Vercel en `CORS_ORIGINS`

### Actualizar CORS en Backend

Asegúrate de que tu backend incluya la URL de Vercel en `CORS_ORIGINS`:
```env
CORS_ORIGINS=https://tu-app.vercel.app,http://localhost:5173
```

### Variables de Entorno Recomendadas

- `VITE_API_BASE_URL`: URL completa del backend API (ej: `https://api.tu-dominio.com`)

## Notas de Desarrollo

- **Mobile-First**: Todos los componentes están diseñados primero para móvil
- **TypeScript**: Tipado estricto para mejor desarrollo
- **Context API**: Estado global para autenticación y facility
- **Error Handling**: Manejo de errores centralizado en el cliente HTTP
- **Loading States**: Estados de carga en todas las operaciones async
- **Confirmations**: Confirmaciones para acciones críticas (eliminar, finalizar)

## Troubleshooting

**Error de CORS**:
- Verifica que el backend tenga `http://localhost:5173` en `CORS_ORIGINS`
- Verifica que `VITE_API_BASE_URL` esté correctamente configurado

**Token expirado**:
- El cliente HTTP redirige automáticamente a `/login` si recibe un 401

**PWA no se instala**:
- Asegúrate de que los iconos existan en `public/icons/`
- Verifica que estés usando HTTPS en producción (o localhost para desarrollo)

## Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Build para producción
- `npm run preview` - Preview del build de producción
- `npm run lint` - Ejecuta ESLint

## Próximas Mejoras

- [ ] Funcionalidad completa de Documentos
- [ ] Funcionalidad completa de Certificados
- [ ] Notificaciones push
- [ ] Modo offline mejorado
- [ ] Tests unitarios e integración
