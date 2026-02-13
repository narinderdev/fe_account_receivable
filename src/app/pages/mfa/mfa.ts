import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Spinner } from '../../shared/spinner/spinner';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: [CommonModule, FormsModule, Spinner],
  templateUrl: './mfa.html',
  styleUrls: ['./mfa.css']
})
export class MfaComponent implements OnInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren('disableOtpInput') disableOtpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  loading = false;
  setupSecret?: string;
  qrCodeImage?: string;
  error?: string;
  otpDigits: string[] = Array(6).fill('');
  submittingOtp = false;
  otpError?: string;
  mfaEnabled = false;
  disableOtpDigits: string[] = Array(6).fill('');
  showDisableForm = false;
  disabling = false;
  disableError?: string;

  constructor(
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('mfaEnabled') : null;
    this.mfaEnabled = stored === 'true';
    this.fetchSetup();
  }

  fetchSetup() {
    if (this.mfaEnabled) {
      return;
    }
    this.loading = true;
    this.error = undefined;
    this.auth.getMfaSetup().subscribe({
      next: res => {
        this.setupSecret = res.data?.secret;
        this.qrCodeImage = res.data?.qrCodeImage;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.message || 'Unable to load MFA setup.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  onEnableInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');

    this.otpDigits[index] = '';

    if (value) {
      this.otpDigits[index] = value.slice(-1);
      input.value = this.otpDigits[index];

      if (index < this.otpDigits.length - 1) {
        this.focusEnableInput(index + 1);
      }
    } else {
      input.value = '';
    }

    this.otpError = undefined;
  }

  onEnableKeydown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (!this.otpDigits[index] && index > 0) {
        this.otpDigits[index - 1] = '';
        const prev = this.otpInputs.get(index - 1);
        if (prev) {
          prev.nativeElement.value = '';
        }
        this.focusEnableInput(index - 1);
      } else {
        this.otpDigits[index] = '';
        input.value = '';
      }
    }
  }

  onEnablePaste(event: ClipboardEvent, index: number) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '') || '';

    for (let i = 0; i < pasted.length && index + i < this.otpDigits.length; i++) {
      this.otpDigits[index + i] = pasted[i];
      const input = this.otpInputs.get(index + i);
      if (input) {
        input.nativeElement.value = pasted[i];
      }
    }

    const nextIndex = Math.min(index + pasted.length, this.otpDigits.length - 1);
    this.focusEnableInput(nextIndex);
    this.otpError = undefined;
  }

  private focusEnableInput(index: number) {
    const el = this.otpInputs.get(index)?.nativeElement;
    if (el) {
      el.focus();
      el.select();
    }
  }

  startDisableFlow() {
    this.showDisableForm = true;
    this.disableError = undefined;
    this.disableOtpDigits = Array(6).fill('');
    this.clearDisableInputs();
    // focus first input after view renders
    setTimeout(() => this.focusDisableInput(0), 0);
  }

  onDisableInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');

    this.disableOtpDigits[index] = '';

    if (value) {
      this.disableOtpDigits[index] = value.slice(-1);
      input.value = this.disableOtpDigits[index];

      if (index < this.disableOtpDigits.length - 1) {
        this.focusDisableInput(index + 1);
      }
    } else {
      input.value = '';
    }

    this.disableError = undefined;
  }

  onDisableKeydown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (!this.disableOtpDigits[index] && index > 0) {
        this.disableOtpDigits[index - 1] = '';
        const prevInput = this.disableOtpInputs.get(index - 1);
        if (prevInput) {
          prevInput.nativeElement.value = '';
        }
        this.focusDisableInput(index - 1);
      } else {
        this.disableOtpDigits[index] = '';
        input.value = '';
      }
    }
  }

  onDisablePaste(event: ClipboardEvent, index: number) {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text').replace(/\D/g, '') || '';

    for (let i = 0; i < pastedText.length && index + i < this.disableOtpDigits.length; i++) {
      this.disableOtpDigits[index + i] = pastedText[i];
      const input = this.disableOtpInputs.get(index + i);
      if (input) {
        input.nativeElement.value = pastedText[i];
      }
    }

    const nextIndex = Math.min(index + pastedText.length, this.disableOtpDigits.length - 1);
    this.focusDisableInput(nextIndex);
    this.disableError = undefined;
  }

  private focusDisableInput(index: number) {
    const el = this.disableOtpInputs.get(index)?.nativeElement;
    if (el) {
      el.focus();
      el.select();
    }
  }

  private clearDisableInputs() {
    this.disableOtpInputs.forEach(input => {
      input.nativeElement.value = '';
    });
  }

  submitOtp() {
    if (this.submittingOtp) return;
    const otp = this.otpDigits.join('');
    if (otp.length !== 6) {
      this.otpError = 'Enter the 6-digit code.';
      this.cdr.detectChanges();
      return;
    }
    this.otpError = undefined;
    this.submittingOtp = true;
    this.auth
      .verifyMfaSetup(otp)
      .pipe(
        finalize(() => {
          this.submittingOtp = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          const success = (res?.statusCode ?? 0) === 200 || (res?.statusCode ?? 0) === 201 || (res?.statusCode ?? 0) === 0;
          if (success) {
            this.mfaEnabled = true;
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('mfaEnabled', 'true');
            }
            this.toastr.success(res?.message || 'MFA enabled successfully.');
          } else {
            this.otpError = res?.message || 'Invalid code. Please try again.';
          }
        },
        error: err => {
          this.otpError = err?.error?.message || 'Invalid code. Please try again.';
        }
      });
  }

  disableMfa() {
    if (this.disabling) return;
    if (!this.showDisableForm) {
      this.startDisableFlow();
      return;
    }
    const otp = this.disableOtpDigits.join('');
    if (otp.length !== 6) {
      this.disableError = 'Enter the 6-digit code to disable.';
      this.cdr.detectChanges();
      return;
    }
    this.disableError = undefined;
    this.disabling = true;
    this.auth
      .disableMfa(otp)
      .pipe(
        finalize(() => {
          this.disabling = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          const success = (res?.statusCode ?? 0) === 200 || (res?.statusCode ?? 0) === 201 || (res?.statusCode ?? 0) === 0;
          if (success) {
            this.mfaEnabled = false;
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('mfaEnabled', 'false');
            }
            this.toastr.success(res?.message || 'MFA disabled.');
            // Reset disable OTP fields
            this.disableOtpDigits = Array(6).fill('');
            this.clearDisableInputs();
            this.showDisableForm = false;
            if (typeof window !== 'undefined') {
              setTimeout(() => window.location.reload(), 300);
            }
          } else {
            this.disableError = res?.message || 'Invalid code. Please try again.';
          }
        },
        error: err => {
          this.disableError = err?.error?.message || 'Invalid code. Please try again.';
        }
      });
  }
}
