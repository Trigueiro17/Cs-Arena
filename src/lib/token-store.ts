// In-memory token storage (OWASP compliant - NEVER saves tokens in localStorage)
let memoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;
}

export function clearAccessToken(): void {
  memoryAccessToken = null;
  // Clean up any legacy token if present
  try {
    localStorage.removeItem('cs_token');
  } catch {}
}
