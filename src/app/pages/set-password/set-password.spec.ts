import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { SignupService } from '../../services/signup-service';
import { ToastrService } from 'ngx-toastr';

import { SetPassword } from './set-password';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('SetPassword', () => {
  const createComponent = () => {
    const route = { queryParams: of({}) } as ActivatedRoute;
    const router = createSpyObj<Router>('Router', ['navigate']);
    const signupService = createSpyObj<SignupService>('SignupService', ['setPassword']);
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    return new SetPassword(new FormBuilder(), route, router, signupService, toastr);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('logic', () => {
    it('validates that passwords must match', () => {
      const instance = createComponent();
      instance.form.patchValue({ password: 'Secret123', confirmPassword: 'Mismatch' });
      expect(instance.passwordMatchValidator(instance.form)).toEqual({ mismatch: true });
    });

    it('tracks password visibility toggles', () => {
      const instance = createComponent();
      instance.togglePasswordVisibility('password');
      expect(instance.passwordVisible).toBe(true);
      instance.togglePasswordVisibility('confirmPassword');
      expect(instance.confirmPasswordVisible).toBe(true);
    });

    it('blocks submit when email is missing', () => {
      const instance = createComponent();
      instance.form.patchValue({ password: 'Secret123', confirmPassword: 'Secret123' });
      instance.email = '';
      instance.submit();
      expect(instance.errorMessage).toContain('Email is missing');
    });
  });
});