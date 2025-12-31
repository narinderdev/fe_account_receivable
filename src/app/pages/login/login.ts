import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LoginService } from '../../services/login-service';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';
import { finalize } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';

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
    private userContext: UserContextService
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
      emailControl.setValue(emailControl.value.toLowerCase());
    }

    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.loading) {
      return;
    }

    const payload = {
      email: this.form.value.email,
      password: this.form.value.password,
    };

    this.loading = true;
    this.cdr.detectChanges();

    this.loginService
      .login(payload)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const statusCode = response?.statusCode;
          const message = response?.message || 'Login successful.';

          if (statusCode === 200 || statusCode === 201) {
            this.toastr.success(message);

            const token = response?.data?.token;
            const user = response?.data?.user;

            if (token) {
              localStorage.setItem('logintoken', token);
            }

            if (user?.id) {
              localStorage.setItem('signupUserId', String(user.id));
            }

            localStorage.setItem('isLoggedIn', 'true');
            this.userContext.setFromLogin(user);

            const userCompanies = Array.isArray(user?.userCompanies) ? user.userCompanies : [];
            if (userCompanies.length > 0) {
              localStorage.setItem('hasCompanies', 'true');
            } else {
              localStorage.removeItem('hasCompanies');
            }

            const nextUrl =
              userCompanies.length > 0 ? this.getLandingRoute() : '/admin/company/add/step-1';
            this.router.navigate([nextUrl]);
          } else {
            this.toastr.error(message || 'Login failed.');
          }
        },
        error: (err) => {
          const backendMessage = err?.error?.message || 'An error occurred. Please try again.';
          this.toastr.error(backendMessage);
          console.error('Login error:', err);
        },
      });
  }

  private getLandingRoute(): string {
    if (this.userContext.isAdmin()) {
      return '/admin/dashboard';
    }

    const permissions = this.userContext.getPermissions();
    const permissionRoutes = [
      { permission: 'VIEW_DASHBOARD', path: '/admin/dashboard' },
      { permission: 'VIEW_CUSTOMERS', path: '/admin/customers' },
      { permission: 'VIEW_INVOICES', path: '/admin/invoices' },
      { permission: 'VIEW_PAYMENTS', path: '/admin/payments' },
      { permission: 'VIEW_AGING_REPORTS', path: '/admin/ar-reports' },
      { permission: 'VIEW_PROMISE_TO_PAY', path: '/admin/collections' },
      { permission: 'VIEW_COMPANY', path: '/admin/company' },
      { permission: 'VIEW_USER', path: '/admin/users' },
      { permission: 'VIEW_ROLES', path: '/admin/roles' },
    ];

    const match = permissionRoutes.find((entry) => permissions.includes(entry.permission));
    return match ? match.path : '/admin/dashboard';
  }
}
