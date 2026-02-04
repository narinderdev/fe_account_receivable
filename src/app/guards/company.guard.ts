import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class CompanyGuard implements CanActivate, CanActivateChild {
  constructor(private router: Router) {}

  private hasCompanies(): boolean {
    return localStorage.getItem('hasCompanies') === 'true';
  }

  private isCompanySetupRoute(url: string): boolean {
    return url.startsWith('/admin/ar-company/add') || url.startsWith('/admin/ar-company/onboarding-complete');
  }

  private validate(url: string): boolean | UrlTree {
    if (!this.hasCompanies() && !this.isCompanySetupRoute(url)) {
      return this.router.parseUrl('/admin/ar-company/add/step-1');
    }
    return true;
  }

  canActivate(_: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.validate(state.url || '');
  }

  canActivateChild(_: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.validate(state.url || '');
  }
}
