import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { SignupService } from '../../services/signup-service';
import { ToastrService } from 'ngx-toastr';

import { VerifyOtp } from './verify-otp';
import { createSpy, createSpyObj } from '../../../testing/spy-helpers';

describe('VerifyOtp', () => {
  const createComponent = () => {
    const route = { queryParams: of({}) } as ActivatedRoute;
    const router = createSpyObj<Router>('Router', ['navigate']);
    const signupService = createSpyObj<SignupService>('SignupService', ['verifyOtp']);
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;

    const instance = new VerifyOtp(route, router, signupService, toastr, cdr);
    return { instance, router, signupService };
  };

  it('should create', () => {
    const { instance } = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('logic', () => {
    it('tracks OTP input indexes correctly', () => {
      const { instance } = createComponent();
      expect(instance.trackByIndex(3)).toBe(3);
    });

    it('prevents submission when OTP is incomplete', () => {
      const { instance, signupService } = createComponent();
      instance.code = ['1', '2', '3', '', '', ''];
      instance.email = 'user@example.com';
      instance.submit();
      expect(instance.errorMessage).toBe('Enter the 6-digit code we sent.');
      expect(signupService.verifyOtp).not.toHaveBeenCalled();
    });

    it('navigates back to signup when editing the email', () => {
      const { instance, router } = createComponent();
      instance.editEmail();
      expect(router.navigate).toHaveBeenCalledWith(['/signup']);
    });
  });
});