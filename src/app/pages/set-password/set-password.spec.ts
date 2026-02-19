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

    it('enforces the same password complexity rules used in signup', () => {
      const instance = createComponent();
      const passwordControl = instance.form.get('password');
      passwordControl?.setValue('Short1!');
      expect(passwordControl?.hasError('passwordComplexity')).toBe(true);
      passwordControl?.setValue('ValidPassword12!');
      expect(passwordControl?.hasError('passwordComplexity')).toBe(false);
    });

    it('shows password rules when the password field interaction occurs', () => {
      const instance = createComponent();
      instance.form.get('password')?.setValue('ValidPassword12!');
      instance.togglePasswordVisibility('password');
      expect(instance.showPasswordRules).toBe(true);
    });

    it('blocks submit when email is missing', () => {
      const instance = createComponent();
      instance.form.patchValue({ password: 'Secret1234!@', confirmPassword: 'Secret1234!@' });
      instance.email = '';
      instance.submit();
      expect(instance.errorMessage).toContain('Email is missing');
    });
  });
});
