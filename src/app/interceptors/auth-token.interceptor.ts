import { HttpInterceptorFn } from '@angular/common/http';

const PUBLIC_ENDPOINTS = [
  '/auth',
  '/auth/signup',
  '/auth/email/send',
  '/auth/mfa/email/verify',
  '/auth/login/mfa',
  '/auth/mfa/verify-setup',
];

function isPublicRequest(url: string): boolean {
  return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

function getStoredToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem('authToken') ?? localStorage.getItem('logintoken');
}

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (isPublicRequest(req.url)) {
    return next(req);
  }

  const token = getStoredToken();
  if (!token) {
    return next(req);
  }

  const updatedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(updatedRequest);
};
