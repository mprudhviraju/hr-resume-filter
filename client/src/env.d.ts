/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL in production (e.g. API Gateway HTTP API URL). Omit for same-origin / dev proxy. */
  readonly VITE_API_BASE_URL?: string;
  /** Lambda Function URL for SSE streaming (e.g. https://xxx.lambda-url.us-east-1.on.aws). */
  readonly VITE_STREAM_BASE_URL?: string;
  /** Set to "true" to show server-side folder path input (local backend only). */
  readonly VITE_ENABLE_FOLDER_PATH?: string;
  /** Google OAuth 2.0 Client ID for Sign-In. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
