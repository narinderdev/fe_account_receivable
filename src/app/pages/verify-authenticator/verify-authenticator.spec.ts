import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';
import { AuthService } from '../../services/auth.service';
import { VerifyAuthenticatorComponent } from './verify-authenticator';

describe('VerifyAuthenticatorComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mfa_token', 'session-mfa-token');
  });

  it('stores auth token and navigates to dashboard on success', () => {
    const router = createSpyObj<Router>('Router', ['navigate']);
    const authService = createSpyObj<AuthService>('AuthService', ['verifyLoginMfa']);
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;

    authService.verifyLoginMfa.mockReturnValue(
      of({
        statusCode: 200,
        message: 'ok',
        data: {
          token: 'final-token',
          daysUntilPasswordExpiry: 9,
          passwordExpired: false,
        },
      })
    );

    const component = new VerifyAuthenticatorComponent(
      router,
      authService,
      toastr,
      cdr,
      'browser' as unknown as object
    );
    component.code = ['1', '2', '3', '4', '5', '6'];

    component.submit();

    expect(localStorage.getItem('authToken')).toBe('final-token');
    expect(localStorage.getItem('mfa_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });
});
