import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSessionService } from '../services/auth-session.service';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);

  return next(req).pipe(
    catchError((error) => {
      if (error?.status === 403) {
        session.signOut('Session expired or invalid. Please log in again.');
      }
      return throwError(() => error);
    })
  );
};
