import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SignupService } from '../../services/signup-service';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, Spinner, RouterModule],
  templateUrl: './verify-otp.html',
  styleUrls: ['./verify-otp.css'],
})
export class VerifyOtp implements OnInit {
  code: string[] = Array(6).fill('');
  loading = false;
  email = '';
  errorMessage = '';

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private signupService: SignupService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Get email from query params (from proper signup flow)
    this.route.queryParams.subscribe((params) => {
      const emailParam = params['email'];

      if (emailParam) {
        // Email from query params - legitimate flow
        this.email = emailParam;
        localStorage.setItem('signupEmail', emailParam);
      } else {
        const storedEmail = localStorage.getItem('signupEmail');
        const signupUserId = localStorage.getItem('signupUserId');
        if (storedEmail && signupUserId) {
          this.email = storedEmail;
        } else {
          this.toastr.warning('Please complete signup first');
          this.router.navigate(['/signup']);
        }
      }
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  handleInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');

    this.code[index] = '';

    if (value) {
      this.code[index] = value.slice(-1);
      input.value = this.code[index];

      if (index < this.code.length - 1) {
        this.focusInput(index + 1);
      } else {
        // Last digit entered - check if all digits are filled
        this.checkAndAutoSubmit();
      }
    } else {
      input.value = '';
    }

    this.errorMessage = '';
  }

  handleKeyDown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (!this.code[index] && index > 0) {
        this.code[index - 1] = '';
        const prevInput = this.inputs.get(index - 1);
        if (prevInput) {
          prevInput.nativeElement.value = '';
        }
        this.focusInput(index - 1);
      } else {
        this.code[index] = '';
        input.value = '';
      }
    }
  }

  handlePaste(event: ClipboardEvent, index: number) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text').replace(/\D/g, '') || '';

    for (let i = 0; i < pastedData.length && index + i < this.code.length; i++) {
      this.code[index + i] = pastedData[i];
      const input = this.inputs.get(index + i);
      if (input) {
        input.nativeElement.value = pastedData[i];
      }
    }

    const nextIndex = Math.min(index + pastedData.length, this.code.length - 1);
    this.focusInput(nextIndex);
    this.errorMessage = '';

    // Check if all digits are filled after paste
    this.checkAndAutoSubmit();
  }

  checkAndAutoSubmit() {
    // Check if all 6 digits are filled
    const allFilled = this.code.every((digit) => digit !== '');
    if (allFilled) {
      // Auto-submit after a short delay to allow user to see all digits
      setTimeout(() => {
        this.submit();
      }, 300);
    }
  }

  focusInput(index: number) {
    const input = this.inputs.get(index);
    input?.nativeElement.focus();
    input?.nativeElement.select();
  }

  submit() {
    if (this.loading) {
      return;
    }

    const otp = this.code.join('');
    if (otp.length !== 6) {
      this.errorMessage = 'Enter the 6-digit code we sent.';
      return;
    }

    if (!this.email) {
      this.errorMessage = 'Email is missing. Please go back to signup.';
      this.toastr.error('Email is missing');
      return;
    }

    const payload = {
      email: this.email,
      otp: otp,
    };

    this.loading = true;
    this.cdr.detectChanges();

    this.signupService
      .verifyOtp(payload)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const statusCode = response?.statusCode;
          const isSuccess = statusCode === 200 || statusCode === 201;
          const message =
            response?.message || (isSuccess ? 'OTP verified successfully.' : 'Invalid code.');

          if (isSuccess) {
            this.toastr.success(message);
            localStorage.removeItem('signupUserId');
            localStorage.removeItem('signupEmail');
            this.router.navigate(['/login']);
          } else {
            this.errorMessage = message;
            this.toastr.error(message);
          }
        },
        error: (error) => {
          const message = error?.error?.message || 'Invalid code. Please try again.';
          this.errorMessage = message;
          this.toastr.error(message);
        },
      });
  }

  editEmail() {
    this.router.navigate(['/signup']);
  }
}
