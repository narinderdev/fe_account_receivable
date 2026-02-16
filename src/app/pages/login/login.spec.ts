import { FormBuilder } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login-service';
import { ToastrService } from 'ngx-toastr';
import { UserContextService } from '../../services/user-context.service';
import { AuthService } from '../../services/auth.service';
import { Login } from './login';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';
import { of } from 'rxjs';

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
  });

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
    const authService = createSpyObj<AuthService>('AuthService', ['sendEmailMfaCode']);
    return {
      instance: new Login(
        new FormBuilder(),
        router,
        loginService,
        toastr,
        cdr,
        userContext,
        authService
      ),
      loginService,
      authService,
      router,
      userContext,
      toastr,
    };
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

    it('normalizes email on submission and navigates to verify-account after login', () => {
      const { instance, loginService, authService, router } = createComponent();
      loginService.login.mockReturnValue(
        of({
          statusCode: 200,
          message: 'ok',
          data: {
            token: 'temp-token',
            mfa_token: 'mfa-token',
            user: { id: 1, userCompanies: [] },
          },
        })
      );
      authService.sendEmailMfaCode.mockReturnValue(of({ statusCode: 200 }));

      instance.form.setValue({ email: 'USER@Example.com', password: 'Secret123!' });
      instance.submit();

      expect(loginService.login).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Secret123!',
      });
      expect(authService.sendEmailMfaCode).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/verify-account'], {
        queryParams: { email: 'user@example.com' },
      });
    });
  });
});
