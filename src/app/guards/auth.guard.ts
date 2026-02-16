import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  Router,
  UrlTree,
} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private router: Router) {}

  private hasAuthToken(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    return Boolean(localStorage.getItem('authToken') ?? localStorage.getItem('logintoken'));
  }

  private redirectToLogin(): UrlTree {
    return this.router.parseUrl('/login');
  }

  canActivate(): boolean | UrlTree {
    if (this.hasAuthToken()) {
      return true;
    }
    return this.redirectToLogin();
  }

  canActivateChild(): boolean | UrlTree {
    return this.canActivate();
  }
}
