import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';
import { Spinner } from '../../shared/spinner/spinner';
import { CompanySelectionService } from '../../services/company-selection.service';
import { ToastrService } from 'ngx-toastr';
import { LateFeeService, LateFeePayload, LateFeeRule } from '../../services/late-fee-service';
import { UserContextService } from '../../services/user-context.service';

type LateFeeRecord = LateFeeRule;

@Component({
  selector: 'app-late-fee',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Spinner],
  templateUrl: './late-fee.html',
  styleUrl: './late-fee.css',
})
export class LateFee implements OnInit, OnDestroy {
  records: LateFeeRecord[] = [];
  loading = false;
  saving = false;
  modalOpen = false;
  submitted = false;
  editingRecordIndex: number | null = null;
  deleteModalOpen = false;
  deleteTarget: LateFeeRecord | null = null;
  deleting = false;

  currentPage = 0;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  readonly Math = Math;

  mandatoryChargeDisplay = '';
  lateFeePercentageDisplay = '';

  lateFeeForm: FormGroup;

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  private editingRecordOriginal: LateFeeRecord | null = null;
  canViewLateFee = false;
  canCreateLateFee = false;
  canUpdateLateFee = false;
  canDeleteLateFee = false;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private companySelection: CompanySelectionService,
    private lateFeeService: LateFeeService,
    private userContext: UserContextService,
  ) {
    this.lateFeeForm = this.fb.group({
      gracePeriodDays: ['', [Validators.required, Validators.min(0), Validators.max(365)]],
      mandatoryCharge: [null, [Validators.required, Validators.min(0)]],
      lateFeePercentage: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
    this.syncPermissions();
  }

  ngOnInit(): void {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;
      if (this.activeCompanyId === nextId) return;
      this.activeCompanyId = nextId;
      if (this.activeCompanyId) {
        this.loadRecords();
      } else {
        this.records = [];
        this.totalItems = 0;
        this.totalPages = 0;
        this.currentPage = 0;
        this.cdr.detectChanges();
      }
    });
  }

  loadRecords(): void {
    if (!this.canViewLateFee) {
      this.records = [];
      this.totalItems = 0;
      this.totalPages = 0;
      this.currentPage = 0;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }
    if (!this.activeCompanyId) {
      this.records = [];
      this.totalItems = 0;
      this.totalPages = 0;
      this.currentPage = 0;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.lateFeeService
      .getLateFees(this.activeCompanyId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          const data = res?.data;
          const normalized = Array.isArray(data) ? data : data ? [data] : [];
          this.records = normalized.map((record) => ({
            ...record,
            status: record.status ?? 'ACTIVE',
          }));
          this.totalItems = this.records.length;
          this.totalPages = this.totalItems > 0 ? Math.ceil(this.totalItems / this.pageSize) : 0;
          this.currentPage = this.totalPages === 0 ? 0 : Math.min(this.currentPage, this.totalPages - 1);
          if (this.currentPage < 0) {
            this.currentPage = 0;
          }
        },
        error: (error) => {
          const statusCode = error?.status ?? error?.error?.statusCode;
          if (statusCode === 404) {
            this.records = [];
            this.totalItems = 0;
            this.totalPages = 0;
            this.currentPage = 0;
            return;
          }
          this.toastr.error('Could not load late fee rules. Please try again.', 'Error');
        },
      });
  }

  openModal(): void {
    if (!this.canCreateLateFee) {
      this.toastr.warning('You do not have permission to create late fee rules.', 'Permission Denied');
      return;
    }
    this.submitted = false;
    this.editingRecordIndex = null;
    this.editingRecordOriginal = null;
    this.mandatoryChargeDisplay = '';
    this.lateFeePercentageDisplay = '';
    this.lateFeeForm.reset({
      gracePeriodDays: '',
      mandatoryCharge: null,
      lateFeePercentage: null,
    });
    this.modalOpen = true;
  }

  editLateFee(index: number): void {
    if (!this.canUpdateLateFee) {
      this.toastr.warning('You do not have permission to update late fee rules.', 'Permission Denied');
      return;
    }
    const record = this.records[index];
    if (!record) {
      return;
    }
    this.editingRecordIndex = index;
    this.editingRecordOriginal = { ...record };
    this.submitted = false;
    this.mandatoryChargeDisplay =
      record.mandatoryCharge != null ? this.formatDisplay(record.mandatoryCharge) : '';
    this.lateFeePercentageDisplay =
      record.lateFeePercentage != null ? this.formatPercentInput(record.lateFeePercentage) : '';
    this.lateFeeForm.patchValue({
      gracePeriodDays: record.gracePeriodDays,
      mandatoryCharge: record.mandatoryCharge,
      lateFeePercentage: record.lateFeePercentage,
    });
    this.modalOpen = true;
  }

  openDeleteModal(record: LateFeeRecord): void {
    if (!this.canDeleteLateFee) {
      this.toastr.warning('You do not have permission to delete late fee rules.', 'Permission Denied');
      return;
    }
    if (!record?.id) {
      this.toastr.error('Unable to identify the late fee rule to delete.', 'Error');
      return;
    }
    this.deleteTarget = record;
    this.deleteModalOpen = true;
    this.deleting = false;
  }

  closeDeleteModal(force = false): void {
    if (this.deleting && !force) {
      return;
    }
    this.deleteModalOpen = false;
    this.deleteTarget = null;
  }

  closeModal(): void {
    if (this.saving) return;
    this.modalOpen = false;
    this.submitted = false;
    this.editingRecordIndex = null;
    this.editingRecordOriginal = null;
    this.mandatoryChargeDisplay = '';
    this.lateFeePercentageDisplay = '';
    this.lateFeeForm.reset({
      gracePeriodDays: '',
      mandatoryCharge: null,
      lateFeePercentage: null,
    });
  }

  // ---------------------------
  // KEYBOARD GUARDS
  // ---------------------------
  onlyDigitsAndDecimal(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    const inputValue = (event.target as HTMLInputElement).value;

    if (
      [46, 8, 9, 27, 13].indexOf(charCode) !== -1 ||
      (charCode === 65 && event.ctrlKey) ||
      (charCode === 67 && event.ctrlKey) ||
      (charCode === 86 && event.ctrlKey) ||
      (charCode === 88 && event.ctrlKey)
    ) {
      return true;
    }

    if (charCode === 46) {
      if (inputValue.replace(/[$,]/g, '').indexOf('.') !== -1) {
        event.preventDefault();
        return false;
      }
      return true;
    }

    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onlyDigits(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (
      [46, 8, 9, 27, 13].indexOf(charCode) !== -1 ||
      (charCode === 65 && event.ctrlKey) ||
      (charCode === 67 && event.ctrlKey) ||
      (charCode === 86 && event.ctrlKey) ||
      (charCode === 88 && event.ctrlKey)
    ) {
      return true;
    }
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onPaste(event: ClipboardEvent): void {
    const pastedText = event.clipboardData?.getData('text');
    if (pastedText && !/^\d*\.?\d*$/.test(pastedText)) {
      event.preventDefault();
    }
  }

  // ---------------------------
  // CURRENCY INPUT HANDLERS
  // ---------------------------
  onMandatoryLateFeeInput(event: any): void {
    const raw = event.target.value.replace(/[^\d.]/g, '');
    this.mandatoryChargeDisplay = raw;
    this.lateFeeForm.patchValue(
      { mandatoryCharge: raw ? parseFloat(raw) : null },
      { emitEvent: false },
    );
  }

  formatMandatoryLateFeeOnBlur(): void {
    const val = this.lateFeeForm.get('mandatoryCharge')?.value;
    this.mandatoryChargeDisplay = val != null && !isNaN(val) ? this.formatDisplay(val) : '';
  }

  removeMandatoryLateFeeFormatting(): void {
    const val = this.lateFeeForm.get('mandatoryCharge')?.value;
    this.mandatoryChargeDisplay = val != null ? String(val) : '';
  }

  onLateFeeInput(event: any): void {
    const raw = event.target.value.replace(/[^\d.]/g, '');
    this.lateFeePercentageDisplay = raw;
    this.lateFeeForm.patchValue({ lateFeePercentage: raw ? parseFloat(raw) : null }, { emitEvent: false });
  }

  formatLateFeeOnBlur(): void {
    const val = this.lateFeeForm.get('lateFeePercentage')?.value;
    this.lateFeePercentageDisplay = val != null && !isNaN(val) ? this.formatPercentInput(val) : '';
  }

  removeLateFeeFormatting(): void {
    const val = this.lateFeeForm.get('lateFeePercentage')?.value;
    this.lateFeePercentageDisplay = val != null ? this.formatPercentInput(val) : '';
  }

  private buildUpdatePayload(payload: LateFeePayload): Partial<LateFeePayload> {
    if (!this.editingRecordOriginal) {
      return payload;
    }

    const updates: Partial<LateFeePayload> = {};
    const original = this.editingRecordOriginal;

    if (payload.gracePeriodDays !== original.gracePeriodDays) {
      updates.gracePeriodDays = payload.gracePeriodDays;
    }

    if (Number(payload.mandatoryCharge) !== Number(original.mandatoryCharge)) {
      updates.mandatoryCharge = payload.mandatoryCharge;
    }

    if (Number(payload.lateFeePercentage) !== Number(original.lateFeePercentage)) {
      updates.lateFeePercentage = payload.lateFeePercentage;
    }

    return updates;
  }

  private formatDisplay(value: number): string {
    const parts = value.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  private formatPercentInput(value: number): string {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
      return '';
    }
    const formatted = normalized.toFixed(2).replace(/\.?0+$/, '');
    return formatted || '0';
  }

  formatDollars(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(Number(value))) {
      return '$0.00';
    }
    return `$${this.formatDisplay(Number(value))}`;
  }

  formatPercent(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(Number(value))) {
      return '0%';
    }
    const normalized = Number(value);
    const formatted = normalized.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted || '0'}%`;
  }

  get pagedRecords(): LateFeeRecord[] {
    if (this.records.length === 0) {
      return [];
    }
    const start = this.currentPage * this.pageSize;
    return this.records.slice(start, start + this.pageSize);
  }

  // ---------------------------
  // SAVE
  // ---------------------------
  saveLateFee(): void {
    this.submitted = true;
    if (this.lateFeeForm.invalid) return;
    if (!this.activeCompanyId) {
      this.toastr.error('Select a company before saving a late fee.', 'Error');
      return;
    }
    const isEditing = this.editingRecordIndex !== null;
    if (isEditing && !this.canUpdateLateFee) {
      this.toastr.warning('You do not have permission to update late fee rules.', 'Permission Denied');
      return;
    }
    if (!isEditing && !this.canCreateLateFee) {
      this.toastr.warning('You do not have permission to create late fee rules.', 'Permission Denied');
      return;
    }

    const formVal = this.lateFeeForm.value;
    const payload: LateFeePayload = {
      gracePeriodDays: Number(formVal.gracePeriodDays),
      mandatoryCharge: formVal.mandatoryCharge ?? 0,
      lateFeePercentage: formVal.lateFeePercentage ?? 0,
    };

    let request$;

    if (isEditing) {
      const lateFeeId = this.editingRecordOriginal?.id;
      if (!lateFeeId) {
        this.toastr.error('Unable to identify the late fee rule to update.', 'Error');
        return;
      }
      const updates = this.buildUpdatePayload(payload);
      if (Object.keys(updates).length === 0) {
        this.toastr.info('No changes detected.', 'Late Fee');
        return;
      }
      request$ = this.lateFeeService.updateLateFee(lateFeeId, updates);
    } else {
      request$ = this.lateFeeService.createLateFee(this.activeCompanyId, payload);
    }

    this.saving = true;
    request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          const action = isEditing ? 'updated' : 'created';
          this.toastr.success(`Late fee ${action} successfully.`, 'Success');
          this.modalOpen = false;
          this.submitted = false;
          this.editingRecordIndex = null;
          this.editingRecordOriginal = null;
          this.loadRecords();
        },
        error: (error) => {
          const message =
            error?.error?.message || 'Unable to save late fee. Please try again.';
          this.toastr.error(message, 'Error');
        },
      });
  }

  confirmDelete(): void {
    if (!this.canDeleteLateFee) {
      this.toastr.warning('You do not have permission to delete late fee rules.', 'Permission Denied');
      return;
    }
    if (!this.deleteTarget?.id) {
      this.toastr.error('Unable to identify the late fee rule to delete.', 'Error');
      return;
    }
    this.deleting = true;
    this.lateFeeService
      .deleteLateFee(this.deleteTarget.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.deleting = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Late fee deleted successfully.', 'Success');
          this.closeDeleteModal(true);
          this.loadRecords();
        },
        error: (error) => {
          const message = error?.error?.message || 'Unable to delete late fee. Please try again.';
          this.toastr.error(message, 'Error');
        },
      });
  }

  // ---------------------------
  // PAGINATION
  // ---------------------------
  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage + 1;
    if (total <= 1) {
      return total === 1 ? [1] : [];
    }
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (current > 3) pages.push(-1);
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private syncPermissions() {
    this.canViewLateFee = this.userContext.hasPermission('VIEW_LATE_FEE');
    this.canCreateLateFee = this.userContext.hasPermission('CREATE_LATE_FEE');
    this.canUpdateLateFee = this.userContext.hasPermission('UPDATE_LATE_FEE');
    this.canDeleteLateFee = this.userContext.hasPermission('DELETE_LATE_FEE');
  }
}
