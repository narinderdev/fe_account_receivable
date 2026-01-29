import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

import { AuthSessionService } from '../services/auth-session.service';

const shouldForceLogout = (error: unknown): error is HttpErrorResponse =>
  error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);

  return next(req).pipe(
    catchError((error) => {
      if (shouldForceLogout(error)) {
        session.signOut('Session expired. Please log in again.');
      }
      return throwError(() => error);
    }),
  );
};
