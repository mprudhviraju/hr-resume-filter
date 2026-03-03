const API_KEY_STORAGE_KEY = 'openai_api_key';

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

