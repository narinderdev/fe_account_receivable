import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SignupService } from '../../services/signup-service';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';
import { Subject, finalize, takeUntil } from 'rxjs';
import { PasswordRulesComponent } from '../../shared/password-rules/password-rules.component';
import {
  PasswordRule,
  evaluatePasswordRules,
  passwordComplexityValidator,
} from '../../utils/password-rules.util';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, Spinner, RouterModule, PasswordRulesComponent],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup implements OnDestroy {
  form: FormGroup;
  loading: boolean = false;
  passwordVisible = false;
  confirmPasswordVisible = false;
  passwordRules: PasswordRule[] = evaluatePasswordRules('');
  showPasswordRules = false;
  readonly passwordRulesHelperId = 'signup-password-rules-helper';
  private passwordFieldFocused = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private signupService: SignupService,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2,}$/)]],
        lastName: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2,}$/)]],
        email: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/),
          ],
        ],
        password: [
          '',
          [
            Validators.required,
            passwordComplexityValidator(),
          ],
        ],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: [this.passwordMatchValidator],
      }
    );

    const passwordControl = this.form.get('password');
    if (passwordControl) {
      this.passwordRules = evaluatePasswordRules(passwordControl.value);
      passwordControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
        this.passwordRules = evaluatePasswordRules(value);
        const hasValue = Boolean((value ?? '').length);
        this.updatePasswordRulesVisibility(hasValue);
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  passwordMatchValidator(form: FormGroup) {
    const pass = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }

    if (field === 'password') {
      this.passwordFieldFocused = true;
      this.updatePasswordRulesVisibility(true);
    }
  }

  onEmailBlur() {
    const emailControl = this.form.get('email');
    if (emailControl && emailControl.value) {
      const lowercaseValue = emailControl.value.toLowerCase();
      emailControl.setValue(lowercaseValue);
    }
  }

  // Submit method
  submit() {
    // Ensure email is lowercase before submission
    const emailControl = this.form.get('email');
    if (emailControl && emailControl.value) {
      emailControl.setValue(emailControl.value.toLowerCase());
    }

    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const signUpData = {
      firstName: this.form.value.firstName,
      lastName: this.form.value.lastName,
      email: this.form.value.email,
      password: this.form.value.password,
    };

    this.loading = true;
    this.cdr.detectChanges();

    this.signupService
      .signup(signUpData)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const statusCode = response?.statusCode;
          const message = response?.message || 'Signup successful';

          if (statusCode === 201 || statusCode === 202) {
            this.toastr.success(message);

            const userId = response?.data?.id;
            if (userId) {
              localStorage.setItem('signupUserId', String(userId));
            }

            if (this.form.value.email) {
              localStorage.setItem('signupEmail', this.form.value.email);
            }

            this.router.navigate(['/verify-otp'], {
              queryParams: { email: this.form.value.email },
            });
          } else {
            // Handle non-success status codes (like 409)
            this.toastr.error(message || 'Signup failed');
          }
        },
        error: (err) => {
          const errorMessage =
            err?.error?.message || 'An error occurred during signup. Please try again.';
          this.toastr.error(errorMessage);
          console.error('Sign Up Error:', err);
        },
      });
  }

  onPasswordFocus() {
    this.passwordFieldFocused = true;
    const hasValue = Boolean(this.form.get('password')?.value);
    this.updatePasswordRulesVisibility(hasValue);
  }

  onPasswordBlur() {
    this.passwordFieldFocused = false;
    this.updatePasswordRulesVisibility(Boolean(this.form.get('password')?.value));
  }

  onPasswordInput(value: string) {
    this.updatePasswordRulesVisibility(Boolean(value?.length));
  }

  private updatePasswordRulesVisibility(hasValue: boolean) {
    this.showPasswordRules = this.passwordFieldFocused || hasValue;
  }
}
