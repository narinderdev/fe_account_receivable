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

  private isLoggedIn(): boolean {
    return localStorage.getItem('isLoggedIn') === 'true';
  }

  private hasSignupUser(): boolean {
    return !!localStorage.getItem('signupUserId');
  }

  private redirectToLogin(): UrlTree {
    return this.router.parseUrl('/login');
  }

  canActivate(): boolean | UrlTree {
    if (this.isLoggedIn() || this.hasSignupUser()) {
      return true;
    }
    return this.redirectToLogin();
  }

  canActivateChild(): boolean | UrlTree {
    return this.canActivate();
  }
}
