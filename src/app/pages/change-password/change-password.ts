import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize, Subject, takeUntil } from 'rxjs';
import { Spinner } from '../../shared/spinner/spinner';
import { PasswordRulesComponent } from '../../shared/password-rules/password-rules.component';
import {
  PasswordRule,
  evaluatePasswordRules,
  passwordComplexityValidator,
} from '../../utils/password-rules.util';
import { AuthService } from '../../services/auth.service';
import { AuthSessionService } from '../../services/auth-session.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner, RouterModule, PasswordRulesComponent],
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.css'],
})
export class ChangePassword implements OnDestroy {
  form: FormGroup;
  loading = false;
  submitted = false;
  email = '';
  errorMessage = '';
  oldPasswordVisible = false;
  newPasswordVisible = false;
  confirmPasswordVisible = false;
  passwordRules: PasswordRule[] = evaluatePasswordRules('');
  showPasswordRules = false;
  readonly passwordRulesHelperId = 'change-password-rules';
  private passwordFieldFocused = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private authSession: AuthSessionService
  ) {
    this.form = this.fb.group(
      {
        oldPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, passwordComplexityValidator()]],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: [this.passwordMatchValidator],
      }
    );

    const newPasswordControl = this.form.get('newPassword');
    if (newPasswordControl) {
      this.passwordRules = evaluatePasswordRules(newPasswordControl.value);
      newPasswordControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
        this.passwordRules = evaluatePasswordRules(value);
        const hasValue = Boolean((value ?? '').length);
        this.updatePasswordRulesVisibility(hasValue);
      });
    }

    if (typeof localStorage !== 'undefined') {
      this.email = localStorage.getItem('loginEmail') || '';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  passwordMatchValidator = (form: FormGroup) => {
    const pass = form.get('newPassword')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  };

  toggleVisibility(field: 'old' | 'new' | 'confirm') {
    if (field === 'old') {
      this.oldPasswordVisible = !this.oldPasswordVisible;
    } else if (field === 'new') {
      this.newPasswordVisible = !this.newPasswordVisible;
      this.passwordFieldFocused = true;
      this.updatePasswordRulesVisibility(true);
    } else {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }

  onPasswordFocus() {
    this.passwordFieldFocused = true;
    this.updatePasswordRulesVisibility(Boolean(this.form.get('newPassword')?.value));
  }

  onPasswordBlur() {
    this.passwordFieldFocused = false;
    this.updatePasswordRulesVisibility(Boolean(this.form.get('newPassword')?.value));
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

    const payload = {
      oldPassword: this.form.value.oldPassword,
      newPassword: this.form.value.newPassword,
    };

    this.loading = true;
    this.cdr.detectChanges();

    this.authService
      .changePassword(payload)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const message = response?.message || 'Password updated successfully.';
          this.toastr.success(`${message} Please log in again.`);
          this.authSession.signOut();
        },
        error: (error) => {
          const message =
            error?.error?.message || 'Unable to change password. Please verify your details.';
          this.errorMessage = message;
          this.toastr.error(message);
        },
      });
  }

  private updatePasswordRulesVisibility(hasValue: boolean) {
    this.showPasswordRules = this.passwordFieldFocused || hasValue;
  }
}
