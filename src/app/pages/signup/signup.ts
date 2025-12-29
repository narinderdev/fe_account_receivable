import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SignupService } from '../../services/signup-service';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, Spinner],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {
  form: FormGroup;
  loading: boolean = false;
  passwordVisible = false;
  confirmPasswordVisible = false;

  constructor(
    private fb: FormBuilder,
    private signupService: SignupService,
    private router: Router,
    private toastr: ToastrService
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
            Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
          ],
        ],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: [this.passwordMatchValidator],
      }
    );
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
  }

  forceLowercase(controlName: string) {
    const control = this.form.get(controlName);
    if (!control) {
      return;
    }

    const rawValue = control.value ?? '';
    if (typeof rawValue !== 'string') {
      return;
    }

    const lower = rawValue.toLowerCase();
    if (rawValue !== lower) {
      control.setValue(lower, { emitEvent: false });
    }
  }

  // Submit method
  submit() {
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
    this.signupService.signup(signUpData).subscribe({
      next: (response) => {
        this.loading = false;
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
          this.toastr.error(message || 'Signup failed');
        }
      },
      error: (err) => {
        this.loading = false;
        const errorMessage =
          err?.error?.message || 'An error occurred during signup. Please try again.';
        this.toastr.error(errorMessage);
        console.error('Sign Up Error:', err);
      },
    });
  }
}
