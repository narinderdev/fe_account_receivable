import { HttpHeaders } from '@angular/common/http';

const TOKEN_STORAGE_KEY = 'logintoken';

function buildAuthorizationHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  return {
    Authorization: `Bearer ${token}`,
  };
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
