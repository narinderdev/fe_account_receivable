import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SignupService } from '../../services/signup-service'; 

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {
  form: FormGroup;
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private signupService: SignupService,
    private router: Router
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

  // Match password & confirm password
  passwordMatchValidator(form: FormGroup) {
    const pass = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
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
          if (response.statusCode === 201) {
            const userId = response?.data?.id;
            if (userId) {
              localStorage.setItem('signupUserId', String(userId));
            }
            this.router.navigate(['/admin/company/add/step-1']);
          }
      },
      error: (err) => {
        this.loading = false;
        console.error('Sign Up Error:', err);
      },
    });
  }
}
