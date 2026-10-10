let memoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken;
  try {
    const stored = localStorage.getItem('cs_access_token');
    if (stored) {
      memoryAccessToken = stored;
      return stored;
    }
  } catch {}
  return null;
}

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;
  try {
    if (token) {
      localStorage.setItem('cs_access_token', token);
    } else {
      localStorage.removeItem('cs_access_token');
    }
  } catch {}
}

export function clearAccessToken(): void {
  memoryAccessToken = null;
  try {
    localStorage.removeItem('cs_access_token');
    localStorage.removeItem('cs_token');
  } catch {}
}
