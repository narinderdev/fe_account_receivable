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
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { Spinner } from '../../shared/spinner/spinner';
import {
  extractAuthMetadata,
  storeAuthToken,
  storeLoginEmail,
  storePasswordMetadata,
  storeTechnicianId,
} from '../../utils/auth-metadata.util';

@Component({
  selector: 'app-verify-account',
  standalone: true,
  imports: [CommonModule, FormsModule, Spinner, RouterModule],
  templateUrl: './verify-account.html',
  styleUrls: ['./verify-account.css'],
})
export class VerifyAccountComponent implements OnInit {
  code: string[] = Array(6).fill('');
  loading = false;
  resendLoading = false;
  email = '';
  errorMessage = '';

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const emailParam = (params['email'] || '').toLowerCase();
      const storedEmail = localStorage.getItem('loginEmail') || '';
      this.email = emailParam || storedEmail;

      if (!this.email) {
        this.toastr.warning('Please log in to continue.');
        this.router.navigate(['/login']);
      } else {
        storeLoginEmail(this.email);
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

    this.checkAndAutoSubmit();
  }

  checkAndAutoSubmit() {
    const allFilled = this.code.every((digit) => digit !== '');
    if (allFilled) {
      setTimeout(() => this.submit(), 250);
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
      this.errorMessage = 'Enter the 6-digit code.';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.authService
      .verifyEmailMfaCode(otp)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const metadata = extractAuthMetadata(response);
          if (metadata.token) {
            storeAuthToken(metadata.token);
          }
          storePasswordMetadata(
            metadata.passwordExpired,
            metadata.daysUntilPasswordExpiry,
            metadata.passwordDaysRemaining,
            { preserveDaysIfMissing: true }
          );
          storeTechnicianId(metadata.technicianId);
          if (metadata.mfaToken) {
            localStorage.setItem('mfa_token', metadata.mfaToken);
          }

          const requiresAuthenticator = localStorage.getItem('mfaEnabled') === 'true';

          this.toastr.success(response?.message || 'Email verified.');
          if (requiresAuthenticator) {
            this.router.navigate(['/verify-authenticator']);
          } else {
            localStorage.removeItem('mfa_token');
            this.router.navigate(['/admin/dashboard']);
          }
        },
        error: (error) => {
          const message = error?.error?.message || 'Invalid code. Please try again.';
          this.errorMessage = message;
          this.toastr.error(message);
        },
      });
  }

  resendCode() {
    if (this.resendLoading) {
      return;
    }
    this.resendLoading = true;
    this.cdr.detectChanges();

    this.authService
      .sendEmailMfaCode()
      .pipe(
        finalize(() => {
          this.resendLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Verification code sent.');
        },
        error: (error) => {
          const message = error?.error?.message || 'Unable to send code. Please try again.';
          this.toastr.error(message);
        },
      });
  }
}
