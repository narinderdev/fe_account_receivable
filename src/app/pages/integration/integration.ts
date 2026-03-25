import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { CompanySelectionService } from '../../services/company-selection.service';
import { PaymentService } from '../../services/payment-service';
import { UserContextService } from '../../services/user-context.service';
import { Spinner } from '../../shared/spinner/spinner';

@Component({
  selector: 'app-integration',
  standalone: true,
  imports: [CommonModule, Spinner],
  templateUrl: './integration.html',
  styleUrl: './integration.css',
})
export class Integration implements OnInit, OnDestroy {
  @ViewChild('eobFileInput') eobFileInput?: ElementRef<HTMLInputElement>;

  isEobModalOpen = false;
  uploadingEob = false;
  canUploadEob = false;
  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;

  constructor(
    private paymentService: PaymentService,
    private companySelection: CompanySelectionService,
    private userContext: UserContextService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {
    this.canUploadEob = this.userContext.hasPermission('APPLY_PAYMENT') || this.userContext.isAdmin();
  }

  ngOnInit(): void {
    const initialId = this.companySelection.getSelectedCompanyId();
    this.activeCompanyId = this.normalizeCompanyId(initialId);

    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((companyId) => {
        this.activeCompanyId = this.normalizeCompanyId(companyId);
      });
  }

  openEobModal(): void {
    if (!this.canUploadEob) {
      this.toastr.warning('You do not have permission to upload Source file.', 'Permission Denied');
      return;
    }

    if (!this.activeCompanyId) {
      this.toastr.warning('Please select an AR company from the navbar first.', 'Company Required');
      return;
    }

    this.isEobModalOpen = true;
    this.cdr.detectChanges();
  }

  closeEobModal(force = false): void {
    if (this.uploadingEob && !force) {
      return;
    }

    this.isEobModalOpen = false;
    this.resetEobFileInput();
    this.cdr.detectChanges();
  }

  handleEobFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!this.canUploadEob) {
      this.toastr.warning('You do not have permission to upload source files.', 'Permission Denied');
      input.value = '';
      return;
    }

    const isTxtFile = file.name.toLowerCase().endsWith('.txt');
    if (!isTxtFile) {
      this.toastr.warning('Please upload a valid source file (.txt).', 'Invalid File');
      input.value = '';
      return;
    }

    if (!this.activeCompanyId) {
      this.toastr.warning('Please select an AR company from the navbar first.', 'Company Required');
      input.value = '';
      return;
    }

    const companyId = this.activeCompanyId;
    this.uploadingEob = true;
    this.cdr.detectChanges();

    this.paymentService.uploadEobFile(companyId, file).subscribe({
      next: () => {
        this.uploadingEob = false;
        this.toastr.success('EOB file uploaded successfully.', 'Success');
        input.value = '';
        this.closeEobModal(true);
      },
      error: (error) => {
        this.uploadingEob = false;
        console.error('Failed to upload Source file:', error);
        const backendMessage = error?.error?.message;
        this.toastr.error(backendMessage || 'Failed to upload Source file.', 'Upload Failed');
        input.value = '';
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetEobFileInput(): void {
    if (this.eobFileInput) {
      this.eobFileInput.nativeElement.value = '';
    }
  }

  private normalizeCompanyId(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
