import { apiClient } from './client';

export interface PushPublicKeyResponse {
  public_key: string;
}

export interface PushSubscribeRequest {
  facility_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
}

export interface PushUnsubscribeRequest {
  facility_id: string;
  endpoint: string;
}

export interface PushPreferencesResponse {
  facility_id: string;
  disabled_event_types: string[];
}

export interface PushPreferencesUpdateRequest {
  facility_id: string;
  disabled_event_types: string[];
}

export interface PushTestRequest {
  facility_id: string;
}

export interface PushTestResponse {
  attempted: number;
  delivered: number;
  deleted: number;
}

export const pushApi = {
  getVapidPublicKey: async (): Promise<string> => {
    const res = await apiClient.get<PushPublicKeyResponse>('/push/vapid-public-key');
    return res.public_key;
  },

  subscribe: async (payload: PushSubscribeRequest): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>('/push/subscribe', payload);
  },

  unsubscribe: async (payload: PushUnsubscribeRequest): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>('/push/unsubscribe', payload);
  },

  getPreferences: async (facilityId: string): Promise<PushPreferencesResponse> => {
    const sp = new URLSearchParams({ facility_id: facilityId });
    return apiClient.get<PushPreferencesResponse>(`/push/preferences?${sp.toString()}`);
  },

  updatePreferences: async (payload: PushPreferencesUpdateRequest): Promise<PushPreferencesResponse> => {
    return apiClient.post<PushPreferencesResponse>('/push/preferences', payload);
  },

  testPush: async (payload: PushTestRequest): Promise<PushTestResponse> => {
    return apiClient.post<PushTestResponse>('/push/test', payload);
  },
};

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const u8 = urlBase64ToUint8Array(base64String);
  // Asegurar que el ArrayBuffer sea exactamente del tamaño de la key
  const buf: ArrayBuffer = u8.buffer;
  return buf.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}
