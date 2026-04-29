import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

import { AuthSessionService } from '../services/auth-session.service';

const shouldForceLogout = (error: unknown): error is HttpErrorResponse =>
  error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);

const SUPPRESSED_AUTH_401_PATHS = [
  '/auth',
  '/auth/email/send',
  '/auth/mfa/email/verify',
  '/auth/login/mfa',
];

const shouldSuppressSessionExpiredMessage = (reqUrl: string, error: HttpErrorResponse) =>
  error.status === 401 &&
  SUPPRESSED_AUTH_401_PATHS.some((path) => reqUrl.includes(path));

const SESSION_EXPIRED_MESSAGE = 'Session expired. Please log in again.';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (shouldForceLogout(error)) {
        const message = shouldSuppressSessionExpiredMessage(req.url, error)
          ? undefined
          : SESSION_EXPIRED_MESSAGE;
        session.signOut(message);
      }
      return throwError(() => error);
    }),
  );
};
