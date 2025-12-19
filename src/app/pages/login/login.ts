import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login-service';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, Spinner],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  form: FormGroup;
  loading = false;
  passwordVisible = false; // To control password visibility

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loginService: LoginService,
    private toastr: ToastrService
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

  // Toggle password visibility
  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible; // Toggle password visibility state
  }

  submit() {
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

    this.loginService.login(payload).subscribe({
      next: (response) => {
        const message = response?.message || 'Login successful.';
        this.toastr.success(message);
        const user = response?.data;
        if (user?.id) {
          localStorage.setItem('signupUserId', String(user.id));
        }

        localStorage.setItem('isLoggedIn', 'true');

        const userCompanies = Array.isArray(user?.userCompanies) ? user.userCompanies : [];

        if (userCompanies.length > 0) {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/admin/company/add/step-1']);
        }
        this.loading = false;
      },
      error: (err) => {
        // Handle error as before
        this.loading = false;
        this.toastr.error('An error occurred. Please try again.');
        console.error('Login error:', err);
      },
    });
  }
}