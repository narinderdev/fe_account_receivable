import { FormBuilder } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { SignupService } from '../../services/signup-service';
import { ToastrService } from 'ngx-toastr';

import { Signup } from './signup';
import { createSpy, createSpyObj } from '../../../testing/spy-helpers';

describe('Signup', () => {
  const createComponent = () => {
    const signupService = createSpyObj<SignupService>('SignupService', ['signup']);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    return new Signup(new FormBuilder(), signupService, router, toastr, cdr);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('logic helpers', () => {
    it('validates that password and confirmation match', () => {
      const instance = createComponent();
      instance.form.patchValue({ password: 'Secret123!', confirmPassword: 'Mismatch' });
      const result = instance.passwordMatchValidator(instance.form);
      expect(result).toEqual({ mismatch: true });
    });

    it('normalizes emails to lowercase on blur', () => {
      const instance = createComponent();
      instance.form.patchValue({ email: 'USER@Example.COM' });
      instance.onEmailBlur();
      expect(instance.form.get('email')?.value).toBe('user@example.com');
    });
  });
});