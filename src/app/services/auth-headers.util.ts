import { HttpHeaders } from '@angular/common/http';

const PRIMARY_TOKEN_KEY = 'authToken';
const LEGACY_TOKEN_KEYS = ['logintoken'];

function resolveToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const direct = localStorage.getItem(PRIMARY_TOKEN_KEY);
  if (direct) {
    return direct;
  }

  for (const key of LEGACY_TOKEN_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      return legacy;
    }
  }

  return null;
}

function buildAuthorizationHeaders(): Record<string, string> {
  const token = resolveToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export function getAuthHeaders(): HttpHeaders {
  return new HttpHeaders(buildAuthorizationHeaders());
}

export function getAuthHeadersWithNgrok(includeNgrokSkipBrowserWarning = false): HttpHeaders {
  const headers = buildAuthorizationHeaders();

  if (includeNgrokSkipBrowserWarning) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  return new HttpHeaders(headers);
}
