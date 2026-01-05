import { FormBuilder } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login-service';
import { ToastrService } from 'ngx-toastr';
import { UserContextService } from '../../services/user-context.service';

import { Login } from './login';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('Login', () => {
  const createComponent = (permissions: string[] = []) => {
    const router = createSpyObj<Router>('Router', ['navigate']);
    const loginService = createSpyObj<LoginService>('LoginService', ['login']);
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const userContext = createSpyObj<UserContextService>('UserContextService', [
      'setFromLogin',
      'isAdmin',
      'getPermissions',
    ]);
    userContext.isAdmin.mockReturnValue(false);
    userContext.getPermissions.mockReturnValue(permissions);
    return { instance: new Login(new FormBuilder(), router, loginService, toastr, cdr, userContext), userContext };
  };

  it('should create', () => {
    const { instance } = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('logic helpers', () => {
    it('toggles password visibility', () => {
      const { instance } = createComponent();
      instance.togglePasswordVisibility();
      expect(instance.passwordVisible).toBe(true);
    });

    it('normalizes the email to lowercase on blur', () => {
      const { instance } = createComponent();
      instance.form.patchValue({ email: 'USER@Example.COM' });
      instance.onEmailBlur();
      expect(instance.form.value.email).toBe('user@example.com');
    });

    it('selects landing route based on permissions', () => {
      const { instance, userContext } = createComponent(['VIEW_INVOICES', 'VIEW_PAYMENTS']);
      expect((instance as any).getLandingRoute()).toBe('/admin/invoices');
      userContext.isAdmin.mockReturnValue(true);
      expect((instance as any).getLandingRoute()).toBe('/admin/dashboard');
    });
  });
});