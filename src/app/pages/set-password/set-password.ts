import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SignupService } from '../../services/signup-service';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';
import { PasswordRulesComponent } from '../../shared/password-rules/password-rules.component';
import {
  PasswordRule,
  evaluatePasswordRules,
  passwordComplexityValidator,
} from '../../utils/password-rules.util';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner, PasswordRulesComponent],
  templateUrl: './set-password.html',
  styleUrls: ['./set-password.css'],
})
export class SetPassword implements OnInit, OnDestroy {
  form: FormGroup;
  submitted = false;
  email: string = '';
  loading = false;
  errorMessage: string = '';
  passwordVisible = false;
  confirmPasswordVisible = false;
  passwordRules: PasswordRule[] = evaluatePasswordRules('');
  showPasswordRules = false;
  readonly passwordRulesHelperId = 'set-password-password-rules';

  private passwordFieldFocused = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private signupService: SignupService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, passwordComplexityValidator()]],
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

  ngOnInit() {
    // Extract email from query parameters
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.email = params['email'];

      if (!this.email) {
        this.errorMessage = 'Invalid link. Email parameter is missing.';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  passwordMatchValidator(group: FormGroup) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
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
      const hasValue = Boolean(this.form.get('password')?.value);
      this.updatePasswordRulesVisibility(hasValue);
    }
  }

  onPasswordFocus() {
    this.passwordFieldFocused = true;
    const hasValue = Boolean(this.form.get('password')?.value);
    this.updatePasswordRulesVisibility(hasValue);
  }

  onPasswordBlur() {
    this.passwordFieldFocused = false;
    const hasValue = Boolean(this.form.get('password')?.value);
    this.updatePasswordRulesVisibility(hasValue);
  }

  onPasswordInput(value: string) {
    this.updatePasswordRulesVisibility(Boolean(value?.length));
  }

  submit() {
    this.submitted = true;
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.email) {
      this.errorMessage = 'Email is missing. Please use the link from your email.';
      return;
    }

    this.loading = true;

    const payload = {
      email: this.email,
      password: this.form.value.password
    };

    this.signupService.setPassword(payload).subscribe({
      next: (response) => {
        console.log('Password set successfully:', response);
        this.loading = false;
        this.toastr.success('Password set successfully! You can now login.');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error setting password:', error);
        this.loading = false;
        this.errorMessage = error.error?.message || 'Failed to set password. Please try again.';
        this.toastr.error(this.errorMessage);
      },
    });
  }

  private updatePasswordRulesVisibility(hasValue: boolean) {
    this.showPasswordRules = this.passwordFieldFocused || hasValue;
  }
}
