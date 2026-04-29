import { FormBuilder } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login-service';
import { ToastrService } from 'ngx-toastr';
import { UserContextService } from '../../services/user-context.service';
import { AuthService } from '../../services/auth.service';
import { CompanySelectionService } from '../../services/company-selection.service';
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
    const companySelection = createSpyObj<CompanySelectionService>('CompanySelectionService', [
      'getSelectedCompanyId',
      'setSelectedCompanyId',
    ]);
    companySelection.getSelectedCompanyId.mockReturnValue(null);
    return {
      instance: new Login(
        new FormBuilder(),
        router,
        loginService,
        toastr,
        cdr,
        userContext,
        authService,
        companySelection
      ),
      loginService,
      authService,
      companySelection,
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
      const { instance, loginService, authService, router, companySelection } = createComponent();
      loginService.login.mockReturnValue(
        of({
          status: 'success',
          statusCode: 200,
          message: 'ok',
          data: {
            token: 'temp-token',
            mfa_token: 'mfa-token',
            user: {
              id: 1,
              firstName: 'Test',
              lastName: 'User',
              email: 'user@example.com',
              status: 'ACTIVE',
              deleted: false,
              userCompanies: [{ company: { id: 99 } }],
              userRoles: [],
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-02T00:00:00.000Z',
            },
          },
        })
      );
      authService.sendEmailMfaCode.mockReturnValue(
        of({ status: 'success', statusCode: 200, message: 'sent', data: null })
      );

      instance.form.setValue({ email: 'USER@Example.com', password: 'Secret123!' });
      instance.submit();

      expect(loginService.login).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Secret123!',
      });
      expect(authService.sendEmailMfaCode).toHaveBeenCalled();
      expect(companySelection.setSelectedCompanyId).toHaveBeenCalledWith('99');
      expect(router.navigate).toHaveBeenCalledWith(['/verify-account'], {
        queryParams: { email: 'user@example.com' },
      });
    });
  });
});
