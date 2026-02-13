import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import {
  PaymentTermsService,
  PaymentTermResponse,
  PaymentTermListResponse,
  PaymentTermDto,
} from '../../services/payment-terms.service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { takeUntil, Subject } from 'rxjs';

interface PaymentTermRecord {
  id?: number;
  name: string;
  days: number;
  description?: string;
  createdAt: string;
  active?: boolean;
}

@Component({
  selector: 'app-payment-terms',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-terms.html',
  styleUrls: ['./payment-terms.css'],
})
export class PaymentTerms implements OnInit, OnDestroy {
  paymentTerms: PaymentTermRecord[] = [];
  loading = false;
  error: string | null = null;
  modalOpen = false;
  submitted = false;
  saving = false;
  editingTerm: PaymentTermRecord | null = null;
  deleteModalOpen = false;
  deleteTarget: PaymentTermRecord | null = null;
  deleting = false;
  private destroy$ = new Subject<void>();

  paymentTermForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private paymentTermsService: PaymentTermsService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService,
  ) {
    this.paymentTermForm = this.formBuilder.group({
      name: ['', Validators.required],
      netDays: ['', [Validators.required, Validators.min(0)]],
      active: [true],
    });
  }

  ngOnInit() {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadPaymentTerms();
    });
    this.loadPaymentTerms();
  }

  openModal() {
    this.modalOpen = true;
    this.submitted = false;
    this.editingTerm = null;
    this.paymentTermForm.reset({ name: '', netDays: '', active: true });
  }

  editPaymentTerm(term: PaymentTermRecord) {
    this.modalOpen = true;
    this.submitted = false;
    this.editingTerm = term;
    this.paymentTermForm.reset({
      name: term.name,
      netDays: term.days,
      active: term.active ?? true,
    });
  }

  closeModal(force = false) {
    if (this.saving && !force) {
      return;
    }
    this.modalOpen = false;
    this.submitted = false;
    this.editingTerm = null;
  }

  savePaymentTerm() {
    this.submitted = true;
    if (this.paymentTermForm.invalid || this.saving) {
      return;
    }

    const payload = {
      name: this.paymentTermForm.value.name?.trim() || '',
      netDays: Number(this.paymentTermForm.value.netDays),
      active: Boolean(this.paymentTermForm.value.active),
    };

    if (this.editingTerm?.id) {
      this.updatePaymentTerm(this.editingTerm.id, {
        name: payload.name,
        netDays: payload.netDays,
      });
    } else {
      this.createPaymentTerm(payload);
    }
  }

  private createPaymentTerm(payload: { name: string; netDays: number; active: boolean }) {
    const companyId = this.getSelectedCompanyId();
    if (!companyId || Number.isNaN(companyId)) {
      this.toastr.warning('Select an AR Company to add payment terms.', 'Company Required');
      this.saving = false;
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.paymentTermsService.createPaymentTerm(companyId, payload).subscribe({
      next: (response: PaymentTermResponse) => {
        this.toastr.success(response?.message || 'Payment term created successfully', 'Success');
        this.saving = false;
        this.closeModal(true);
        this.loadPaymentTerms();
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        const httpError = error as { error?: { message?: string } };
        const message = httpError?.error?.message || 'Unable to create payment term.';
        this.toastr.error(message, 'Error');
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  private updatePaymentTerm(id: number, payload: { name: string; netDays: number }) {
    const companyId = this.getSelectedCompanyId();
    if (!companyId || Number.isNaN(companyId)) {
      this.toastr.warning('Select an AR Company to update payment terms.', 'Company Required');
      this.saving = false;
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.paymentTermsService.updatePaymentTerm(companyId, id, payload).subscribe({
      next: (response: PaymentTermResponse) => {
        this.toastr.success(response?.message || 'Payment term updated successfully', 'Success');
        this.saving = false;
        this.closeModal(true);
        this.loadPaymentTerms();
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        const httpError = error as { error?: { message?: string } };
        const message = httpError?.error?.message || 'Unable to update payment term.';
        this.toastr.error(message, 'Error');
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  openDeleteModal(term: PaymentTermRecord) {
    this.deleteTarget = term;
    this.deleteModalOpen = true;
    this.deleting = false;
  }

  closeDeleteModal() {
    if (this.deleting) {
      return;
    }
    this.deleteModalOpen = false;
    this.deleteTarget = null;
  }

  confirmDelete() {
    if (!this.deleteTarget?.id || this.deleting) {
      return;
    }
    const companyId = this.getSelectedCompanyId();
    if (!companyId || Number.isNaN(companyId)) {
      this.toastr.warning('Select an AR Company to delete payment terms.', 'Company Required');
      return;
    }
    this.deleting = true;
    this.paymentTermsService.deletePaymentTerm(companyId, this.deleteTarget.id).subscribe({
      next: () => {
        this.toastr.success('Payment term deleted successfully', 'Success');
        this.deleting = false;
        this.closeDeleteModal();
        this.loadPaymentTerms();
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        const httpError = error as { error?: { message?: string } };
        const message = httpError?.error?.message || 'Unable to delete payment term.';
        this.toastr.error(message, 'Error');
        this.deleting = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadPaymentTerms() {
    const companyId = this.getSelectedCompanyId();
    if (!companyId || Number.isNaN(companyId)) {
      this.paymentTerms = [];
      this.error = 'Select an AR Company to view payment terms.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = null;
    this.paymentTermsService
      .getPaymentTerms(companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaymentTermListResponse) => {
          const list = response?.data ?? [];
          this.paymentTerms = list
            .map((term) => this.mapDtoToRecord(term))
            .filter((term): term is PaymentTermRecord => !!term);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          const httpError = error as { error?: { message?: string } };
          this.error = httpError?.error?.message || 'Unable to load payment terms.';
          this.loading = false;
          this.toastr.error(this.error, 'Error');
          this.cdr.detectChanges();
        },
      });
  }

  private mapDtoToRecord(dto?: PaymentTermDto | null): PaymentTermRecord | null {
    if (!dto) {
      return null;
    }

    return {
      id: dto.id,
      name: dto.name ?? 'Untitled',
      days: dto.netDays ?? 0,
      description: dto.description ?? (dto.active === false ? 'Inactive payment term' : '—'),
      createdAt: dto.createdAt ? new Date(dto.createdAt).toLocaleString() : '—',
      active: dto.active ?? true,
    };
  }

  private getSelectedCompanyId(): number | null {
    const companyIdRaw = this.companySelection.getSelectedCompanyId();
    const companyId = typeof companyIdRaw === 'string' ? Number(companyIdRaw) : companyIdRaw;
    return Number.isFinite(companyId) ? companyId : null;
  }

  trackByTermId(index: number, term: PaymentTermRecord) {
    return term.id ?? index;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
