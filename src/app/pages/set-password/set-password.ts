import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SignupService } from '../../services/signup-service';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  templateUrl: './set-password.html',
  styleUrls: ['./set-password.css'],
})
export class SetPassword implements OnInit {
  form: FormGroup;
  submitted = false;
  email: string = '';
  loading = false;
  errorMessage: string = '';
  passwordVisible = false;
  confirmPasswordVisible = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private signupService: SignupService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: [this.passwordMatchValidator],
      }
    );
  }

  ngOnInit() {
    // Extract email from query parameters
    this.route.queryParams.subscribe(params => {
      this.email = params['email'];
      
      if (!this.email) {
        // Handle case where email is missing
        this.errorMessage = 'Invalid link. Email parameter is missing.';
        // Optionally redirect to login or show error
        // this.router.navigate(['/login']);
      }
    });
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
      }
    });
  }
}
