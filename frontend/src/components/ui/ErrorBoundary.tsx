import { Component, ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorMessage: string;
  errorStack: string | null;
}

/**
 * Normaliza cualquier valor a un Error con mensaje y stack
 * Asegura que siempre haya un mensaje útil
 */
function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    // Si el error ya tiene mensaje, usarlo
    if (error.message && error.message.trim()) {
      return error;
    }
    // Si no tiene mensaje pero tiene name, usar name
    if (error.name && error.name !== 'Error') {
      return new Error(error.name);
    }
    // Si tiene stack, intentar extraer info del stack
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      if (stackLines.length > 0) {
        return new Error(stackLines[0] || 'Error desconocido');
      }
    }
    return new Error('Error inesperado');
  }
  
  if (typeof error === 'string') {
    return new Error(error.trim() || 'Error desconocido');
  }
  
  if (typeof error === 'object' && error !== null) {
    try {
      const jsonStr = JSON.stringify(error);
      return new Error(jsonStr || 'Error desconocido');
    } catch {
      return new Error(String(error) || 'Error desconocido');
    }
  }
  
  return new Error(String(error) || 'Error desconocido');
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorMessage: '',
      errorStack: null,
    };
  }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    const normalized = normalizeError(error);
    // Asegurar que siempre haya un mensaje de display útil
    const displayMessage = normalized.message?.trim() 
      ? normalized.message 
      : (normalized.name && normalized.name !== 'Error' 
          ? normalized.name 
          : 'Error inesperado');
    
    return {
      hasError: true,
      error: normalized,
      errorMessage: displayMessage,
      errorStack: normalized.stack || null,
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    const normalized = normalizeError(error);
    
    // Asegurar mensaje de display útil
    const displayMessage = normalized.message?.trim() 
      ? normalized.message 
      : (normalized.name && normalized.name !== 'Error' 
          ? normalized.name 
          : 'Error inesperado');
    
    // SIEMPRE loguear el error con mensaje y stack (también en producción)
    console.error('[ErrorBoundary] caught an error:', {
      name: normalized.name,
      message: normalized.message || 'Error sin mensaje',
      displayMessage,
      stack: normalized.stack,
      error: normalized,
      originalError: error,
    });
    
    // Loguear componentStack siempre
    console.error('[ErrorBoundary] componentStack:', errorInfo?.componentStack);
    
    // NO auto-limpieza de sesión (evita cascadas de redirect)
    // El usuario puede usar el botón "Reparar" si necesita limpiar
    
    // Guardar errorInfo y error normalizado en state
    this.setState({
      error: normalized,
      errorInfo,
      errorMessage: displayMessage,
      errorStack: normalized.stack || null,
    });
  }

  handleGoHome = (): void => {
    // Usar window.location.assign para garantizar navegación incluso si router está roto
    window.location.assign('/');
  };

  handleReload = (): void => {
    // Recargar página completamente (sin limpiar sesión)
    window.location.reload();
  };

  handleRepair = (): void => {
    // Navegar a la misma URL con ?recover=1 para disparar boot.js
    const url = new URL(window.location.href);
    url.searchParams.set('recover', '1');
    window.location.replace(url.toString());
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              borderRadius: '0.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '1.5rem',
              backgroundColor: 'white',
              pointerEvents: 'auto',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#111827',
                  marginBottom: '0.5rem',
                }}
              >
                Algo salió mal
              </h1>
              <p
                style={{
                  color: '#4b5563',
                  marginBottom: '1.5rem',
                }}
              >
                Ocurrió un error inesperado. Por favor, intenta volver al inicio
                o recargar la página.
              </p>
              
              {/* Mostrar error siempre (también en producción) */}
              {this.state.errorMessage && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fef2f2',
                    borderRadius: '0.375rem',
                    textAlign: 'left',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                      color: '#991b1b',
                      wordBreak: 'break-all',
                      marginBottom: (this.state.errorStack || this.state.errorInfo) ? '0.5rem' : 0,
                    }}
                  >
                    {this.state.errorMessage || this.state.error?.name || 'Error inesperado'}
                  </p>
                  {(this.state.errorStack || import.meta.env.VITE_DEBUG_ERRORS === '1') && this.state.errorStack && (
                    <details style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '0.5rem' }}>
                      <summary style={{ cursor: 'pointer' }}>
                        Stack trace
                      </summary>
                      <pre
                        style={{
                          marginTop: '0.5rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          fontSize: '0.7rem',
                        }}
                      >
                        {this.state.errorStack}
                      </pre>
                    </details>
                  )}
                  {this.state.errorInfo && (import.meta.env.DEV || import.meta.env.VITE_DEBUG_ERRORS === '1') && (
                    <details style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '0.5rem' }}>
                      <summary style={{ cursor: 'pointer' }}>
                        Component stack
                      </summary>
                      <pre
                        style={{
                          marginTop: '0.5rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          fontSize: '0.7rem',
                        }}
                      >
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#667eea',
                    color: 'white',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    pointerEvents: 'auto',
                    minHeight: '44px',
                    minWidth: '120px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#5568d3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#667eea';
                  }}
                >
                  Volver al inicio
                </button>
                <button
                  type="button"
                  onClick={this.handleRepair}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    pointerEvents: 'auto',
                    minHeight: '44px',
                    minWidth: '120px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#d97706';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f59e0b';
                  }}
                >
                  Reparar
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    fontWeight: '500',
                    border: '1px solid #d1d5db',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    pointerEvents: 'auto',
                    minHeight: '44px',
                    minWidth: '120px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}