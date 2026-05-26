const API_KEY_STORAGE_KEY = 'openai_api_key';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

/**
 * Get stored OpenAI API key from localStorage
 */
export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

/**
 * Store OpenAI API key in localStorage
 */
export function storeApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
}

/**
 * Remove stored OpenAI API key from localStorage
 */
export function removeApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

/**
 * Check if API key is stored
 */
export function hasApiKey(): boolean {
  return getStoredApiKey() !== null;
}

// --- Server-side API key persistence ---

/**
 * Save API key to the server (DynamoDB) so it persists across browsers/sessions.
 */
export async function saveApiKeyToServer(apiKey: string): Promise<void> {
  const res = await fetch(apiUrl('/api/settings/api-key'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  if (!res.ok) {
    throw new Error('Failed to save API key to server');
  }
}

/**
 * Load the API key status from the server. Returns the masked key
 * and whether a key is stored.
 */
export async function loadApiKeyFromServer(): Promise<{
  apiKey: string | null;
  hasKey: boolean;
}> {
  const res = await fetch(apiUrl('/api/settings/api-key'));
  if (!res.ok) {
    return { apiKey: null, hasKey: false };
  }
  const data = (await res.json()) as { apiKey: string | null; hasKey?: boolean };
  return { apiKey: data.apiKey, hasKey: data.hasKey ?? !!data.apiKey };
}

/**
 * Delete API key from the server.
 */
export async function deleteApiKeyFromServer(): Promise<void> {
  const res = await fetch(apiUrl('/api/settings/api-key'), {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete API key from server');
  }
}
