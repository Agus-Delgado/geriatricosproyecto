/**
 * Helper function to safely open external links
 * Opens link in new tab with security attributes
 */
export function openExternal(url: string): void {
  if (!url || typeof url !== 'string') {
    console.error('openExternal: Invalid URL provided');
    return;
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    console.error('openExternal: Invalid URL format', url);
    return;
  }

  // Open in new window with security attributes
  // IMPORTANT: NO usar window.location.href como fallback porque navegaría la pestaña actual
  try {
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    
    // Si popup fue bloqueado, solo loguear el error pero NO navegar la pestaña actual
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      console.warn('openExternal: Popup bloqueado. No se puede abrir la URL en nueva pestaña:', url);
      // Opcional: mostrar mensaje al usuario si queremos en el futuro
      // Por ahora solo no hacemos nada para no romper la experiencia
    }
  } catch (error) {
    // Solo loguear el error, NO navegar la pestaña actual
    console.error('openExternal: Error opening window', error);
  }
}