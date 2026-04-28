export const PANTALLAS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
} as const;

export function withPantallasCors(headers?: HeadersInit): HeadersInit {
  return {
    ...PANTALLAS_CORS_HEADERS,
    ...(headers ?? {}),
  };
}
