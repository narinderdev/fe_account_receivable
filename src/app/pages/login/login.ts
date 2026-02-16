import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LoginService } from '../../services/login-service';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';
import { catchError, finalize, switchMap, throwError, map } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';
import { AuthService } from '../../services/auth.service';
import {
  extractAuthMetadata,
  storeAuthToken,
  storeLoginEmail,
  storeMfaState,
  storePasswordMetadata,
  storeTechnicianId,
} from '../../utils/auth-metadata.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, Spinner, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  form: FormGroup;
  loading = false;
  passwordVisible = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loginService: LoginService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private userContext: UserContextService,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/),
        ],
      ],
      password: ['', Validators.required],
    });
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  onEmailBlur() {
    const emailControl = this.form.get('email');
    if (emailControl && emailControl.value) {
      const lowercaseValue = emailControl.value.toLowerCase();
      emailControl.setValue(lowercaseValue);
    }
  }

  submit() {
    // Ensure email is lowercase before submission
    const emailControl = this.form.get('email');
    if (emailControl && emailControl.value) {
      emailControl.setValue(emailControl.value.trim().toLowerCase());
    }

    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.loading) {
      return;
    }
    const normalizedEmail = String(this.form.value.email || '').trim().toLowerCase();
    const payload = {
      email: normalizedEmail,
      password: this.form.value.password,
    };

    this.loading = true;
    this.cdr.detectChanges();

    this.loginService
      .login(payload)
      .pipe(
        switchMap((response) => {
          const statusCode = response?.statusCode;
          const message = response?.message || 'Login successful.';
          const isSuccess = statusCode === 200 || statusCode === 201;

          if (!isSuccess) {
            this.toastr.error(message || 'Login failed.');
            return throwError(() => this.markErrorHandled(new Error(message || 'Login failed.')));
          }

          const metadata = extractAuthMetadata(response);
          storeLoginEmail(normalizedEmail);
          storeMfaState(metadata.mfaEnabled, metadata.mfaToken);
          storePasswordMetadata(metadata.passwordExpired, metadata.daysUntilPasswordExpiry);
          storeTechnicianId(metadata.technicianId);
          if (metadata.token) {
            storeAuthToken(metadata.token);
          }

          const user = response?.data?.user;
          if (user?.id) {
            localStorage.setItem('signupUserId', String(user.id));
          }

          this.userContext.setFromLogin(user);

          const userCompanies = Array.isArray(user?.userCompanies) ? user.userCompanies : [];
          if (userCompanies.length > 0) {
            localStorage.setItem('hasCompanies', 'true');
          } else {
            localStorage.removeItem('hasCompanies');
          }

          this.toastr.success(message);

          return this.authService.sendEmailMfaCode().pipe(
            map(() => normalizedEmail),
            catchError((error) => {
              const sendMessage = error?.error?.message || 'Unable to send verification code.';
              this.toastr.error(sendMessage);
              return throwError(() => this.markErrorHandled(error));
            })
          );
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (email) => {
          this.router.navigate(['/verify-account'], {
            queryParams: { email },
          });
        },
        error: (err) => {
          if (!this.wasErrorHandled(err)) {
            const backendMessage = err?.error?.message || err?.message || 'An error occurred. Please try again.';
            this.toastr.error(backendMessage);
          }
          console.error('Login error:', err);
        },
      });
  }

  private markErrorHandled<T extends object>(error: T): T {
    if (error && typeof error === 'object') {
      (error as Record<string, unknown>)['__handled'] = true;
    }
    return error;
  }

  private wasErrorHandled(error: unknown): boolean {
    return Boolean(
      error &&
        typeof error === 'object' &&
        Boolean((error as Record<string, unknown>)['__handled'])
    );
  }
}
