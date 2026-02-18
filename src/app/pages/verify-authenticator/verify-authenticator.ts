import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  ChangeDetectorRef,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AuthService } from '../../services/auth.service';
import { Spinner } from '../../shared/spinner/spinner';
import {
  extractAuthMetadata,
  storeAuthToken,
  storePasswordMetadata,
  storeTechnicianId,
} from '../../utils/auth-metadata.util';

@Component({
  selector: 'app-verify-authenticator',
  standalone: true,
  imports: [CommonModule, FormsModule, Spinner, RouterModule],
  templateUrl: './verify-authenticator.html',
  styleUrls: ['./verify-authenticator.css'],
})
export class VerifyAuthenticatorComponent implements OnInit {
  code: string[] = Array(6).fill('');
  loading = false;
  errorMessage = '';
  private isBrowser = false;

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {}

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
      this.errorMessage = 'Enter the 6-digit code.';
      return;
    }

    const mfaToken = this.isBrowser ? localStorage.getItem('mfa_token') || '' : '';
    if (!mfaToken) {
      this.errorMessage = 'Missing MFA token. Please log in again.';
      this.toastr.error(this.errorMessage);
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.authService
      .verifyLoginMfa(otp, mfaToken)
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
          const message = response?.message || (isSuccess ? 'Verification successful.' : 'Invalid code.');

          if (isSuccess) {
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
            if (this.isBrowser) {
              localStorage.removeItem('mfa_token');
            }
            this.toastr.success(message);
            this.router.navigate(['/admin/dashboard']);
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
}
