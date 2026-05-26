import { getStoredToken } from '../contexts/AuthContext';

const API_KEY_STORAGE_KEY = 'openai_api_key';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function storeApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
}

export function removeApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function hasApiKey(): boolean {
  return getStoredApiKey() !== null;
}

export async function saveApiKeyToServer(apiKey: string): Promise<void> {
  const res = await fetch(apiUrl('/api/settings/api-key'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ apiKey }),
  });
  if (!res.ok) {
    throw new Error('Failed to save API key to server');
  }
}

export async function loadApiKeyFromServer(): Promise<{
  apiKey: string | null;
  hasKey: boolean;
}> {
  const res = await fetch(apiUrl('/api/settings/api-key'), {
    headers: authHeaders(),
  });
  if (!res.ok) {
    return { apiKey: null, hasKey: false };
  }
  const data = (await res.json()) as { apiKey: string | null; hasKey?: boolean };
  return { apiKey: data.apiKey, hasKey: data.hasKey ?? !!data.apiKey };
}

export async function deleteApiKeyFromServer(): Promise<void> {
  const res = await fetch(apiUrl('/api/settings/api-key'), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to delete API key from server');
  }
}
