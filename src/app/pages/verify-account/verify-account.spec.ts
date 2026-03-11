import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { UserContextService } from '../../services/user-context.service';
import { VerifyAccountComponent } from './verify-account';

describe('VerifyAccountComponent', () => {
  const setup = (mfaEnabled: 'true' | 'false') => {
    localStorage.clear();
    localStorage.setItem('mfaEnabled', mfaEnabled);
    localStorage.setItem('loginEmail', 'user@example.com');

    const route = { queryParams: of({}) } as unknown as ActivatedRoute;
    const router = createSpyObj<Router>('Router', ['navigate']);
    const authService = createSpyObj<AuthService>('AuthService', [
      'verifyEmailMfaCode',
      'sendEmailMfaCode',
    ]);
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const userContext = createSpyObj<UserContextService>('UserContextService', ['getDefaultRoute']);
    userContext.getDefaultRoute.mockReturnValue('/admin/dashboard');

    const component = new VerifyAccountComponent(
      route,
      router,
      authService,
      toastr,
      cdr,
      userContext
    );
    component.ngOnInit();
    component.code = ['1', '2', '3', '4', '5', '6'];

    return { component, router, authService };
  };

  it('routes to authenticator when MFA is enabled', () => {
    const { component, router, authService } = setup('true');
    authService.verifyEmailMfaCode.mockReturnValue(
      of({ statusCode: 200, message: 'ok', data: { mfa_token: 'abc123' } })
    );

    component.submit();

    expect(router.navigate).toHaveBeenCalledWith(['/verify-authenticator']);
  });

  it('routes to dashboard when MFA is disabled', () => {
    const { component, router, authService } = setup('false');
    authService.verifyEmailMfaCode.mockReturnValue(
      of({ statusCode: 200, message: 'ok', data: { token: 'final-token' } })
    );

    component.submit();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
    expect(localStorage.getItem('authToken')).toBe('final-token');
  });
});
