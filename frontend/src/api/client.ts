const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ApiError {
  detail: string;
  status?: number;
}

// Handler para errores 401 (no autorizado)
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = {
        detail: 'Error desconocido',
        status: response.status,
      };

      try {
        const data = await response.json();
        const detail = data?.detail ?? data?.message;
        if (typeof detail === 'string') {
          error.detail = detail;
        } else if (Array.isArray(detail)) {
          // FastAPI validation errors (422)
          const msgs = detail
            .map((d: any) => {
              if (typeof d === 'string') return d;
              if (d?.msg) return d.msg as string;
              return JSON.stringify(d);
            })
            .filter(Boolean);
          error.detail = msgs.length > 0 ? msgs.join(' | ') : JSON.stringify(detail);
        } else if (detail !== undefined) {
          error.detail = JSON.stringify(detail);
        }
      } catch {
        error.detail = response.statusText || error.detail;
      }

      // Logging mejorado en desarrollo
      if (import.meta.env.DEV) {
        const url = response.url || 'unknown';
        console.error(`[API Error] ${response.status} ${response.statusText}`, {
          url,
          status: response.status,
          detail: error.detail,
        });
      }

      // Si es 401, limpiar token y notificar al handler
      if (response.status === 401) {
        const reason = response.url?.includes('/auth/me') ? 'token_expired' : 'unauthorized';
        
        // Logging para diagnóstico
        if (import.meta.env.DEV) {
          console.debug(`[API] Error 401 detectado: ${reason}`, {
            url: response.url,
          });
        }
        
        localStorage.removeItem('token');
        localStorage.removeItem('original_token');
        localStorage.removeItem('facility_id');
        localStorage.removeItem('activeFacilityId');
        
        if (onUnauthorized) {
          onUnauthorized();
        } else {
          // Fallback: usar navigate si está disponible en el contexto
          // Si no, usar window.location como último recurso
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            // Solo redirigir si no estamos ya en login para evitar loops
            window.location.href = '/login';
          }
        }
      }

      throw error;
    }

    // Si la respuesta está vacía (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      return this.handleResponse<T>(response);
    } catch (error) {
      // Logging mejorado en desarrollo
      if (import.meta.env.DEV) {
        console.error(`[Network Error] ${endpoint}`, {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      if (error instanceof Error && 'detail' in error) {
        throw error;
      }
      throw {
        detail: error instanceof Error ? error.message : 'Error de conexión',
      } as ApiError;
    }
  }

  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async getBlob(endpoint: string, options?: RequestInit): Promise<Blob> {
    const token = this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      method: 'GET',
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error: ApiError = {
          detail: 'Error desconocido',
          status: response.status,
        };

        try {
          const data = await response.json();
          const detail = data?.detail ?? data?.message;
          if (typeof detail === 'string') {
            error.detail = detail;
          } else if (detail !== undefined) {
            error.detail = JSON.stringify(detail);
          }
        } catch {
          error.detail = response.statusText || error.detail;
        }

        // Si es 401, limpiar token y notificar al handler
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('original_token');
          localStorage.removeItem('facility_id');
          localStorage.removeItem('activeFacilityId');
          
          if (onUnauthorized) {
            onUnauthorized();
          }
        }

        throw error;
      }

      return await response.blob();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`[Network Error] ${endpoint}`, {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      if (error instanceof Error && 'detail' in error) {
        throw error;
      }
      throw {
        detail: error instanceof Error ? error.message : 'Error de conexión',
      } as ApiError;
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
