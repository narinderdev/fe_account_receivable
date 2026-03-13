import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject, finalize, takeUntil } from 'rxjs';
import { CompanySelectionService } from '../../services/company-selection.service';
import {
  AgingCode as AgingCodeRecord,
  AgingCodePayload,
  AgingCodeResponseData,
  AgingCodeService,
} from '../../services/aging-code-service';
import { Spinner } from '../../shared/spinner/spinner';
import { UserContextService } from '../../services/user-context.service';

const MAX_RANGE_DAYS = 3650;
const MAX_DISPLAY_ORDER = 999;

@Component({
  selector: 'app-aging-code',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  templateUrl: './aging-code.html',
  styleUrl: './aging-code.css',
})
export class AgingCode implements OnInit, OnDestroy {
  records: AgingCodeRecord[] = [];
  loading = false;
  saving = false;
  modalOpen = false;
  submitted = false;
  deletingId: number | null = null;
  deleteModalOpen = false;
  deleteTarget: AgingCodeRecord | null = null;
  editingRecordIndex: number | null = null;

  currentPage = 0;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  readonly Math = Math;
  readonly maxRangeDays = MAX_RANGE_DAYS;
  readonly maxDisplayOrder = MAX_DISPLAY_ORDER;

  agingCodeForm: FormGroup;

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  private editingRecordOriginal: AgingCodeRecord | null = null;
  canViewAgingCode = false;
  canCreateAgingCode = false;
  canUpdateAgingCode = false;
  canDeleteAgingCode = false;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private companySelection: CompanySelectionService,
    private agingCodeService: AgingCodeService,
    private userContext: UserContextService,
  ) {
    this.agingCodeForm = this.fb.group(
      {
        bucketName: ['', [Validators.required, Validators.maxLength(50)]],
        startDay: ['', [Validators.required, Validators.min(0), Validators.max(MAX_RANGE_DAYS)]],
        endDay: ['', [Validators.required, Validators.min(0), Validators.max(MAX_RANGE_DAYS)]],
        displayOrder: ['', [Validators.required, Validators.min(0), Validators.max(MAX_DISPLAY_ORDER)]],
      },
      { validators: [this.validateRange()] },
    );
    this.syncPermissions();
  }

  ngOnInit(): void {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;
      if (this.activeCompanyId === nextId) {
        return;
      }
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
    if (!this.canViewAgingCode) {
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
    this.agingCodeService
      .getAgingCodes(this.activeCompanyId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          const data: AgingCodeResponseData = res?.data;
          const normalized = Array.isArray(data) ? data : data ? [data] : [];
          this.records = normalized
            .map((record) => ({
              ...record,
              status: record.status ?? 'ACTIVE',
              startDay: Number(record.startDay ?? 0),
              endDay: Number(record.endDay ?? 0),
              displayOrder: Number(record.displayOrder ?? 0),
            }))
            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
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
          this.toastr.error('Could not load aging codes. Please try again.', 'Error');
        },
      });
  }

  openModal(): void {
    if (!this.canCreateAgingCode) {
      this.toastr.warning('You do not have permission to create aging codes.', 'Permission Denied');
      return;
    }
    this.submitted = false;
    this.editingRecordIndex = null;
    this.editingRecordOriginal = null;
    this.agingCodeForm.reset({
      bucketName: '',
      startDay: '',
      endDay: '',
      displayOrder: '',
    });
    this.modalOpen = true;
  }

  editAgingCode(index: number): void {
    if (!this.canUpdateAgingCode) {
      this.toastr.warning('You do not have permission to update aging codes.', 'Permission Denied');
      return;
    }
    const record = this.records[index];
    if (!record) {
      return;
    }
    this.editingRecordIndex = index;
    this.editingRecordOriginal = { ...record };
    this.submitted = false;
    this.agingCodeForm.reset({
      bucketName: record.bucketName ?? '',
      startDay: record.startDay,
      endDay: record.endDay,
      displayOrder: record.displayOrder,
    });
    this.modalOpen = true;
  }

  closeModal(): void {
    if (this.saving) return;
    this.modalOpen = false;
    this.submitted = false;
    this.editingRecordIndex = null;
    this.editingRecordOriginal = null;
    this.agingCodeForm.reset({
      bucketName: '',
      startDay: '',
      endDay: '',
      displayOrder: '',
    });
  }

  openDeleteModal(record: AgingCodeRecord): void {
    if (!this.canDeleteAgingCode) {
      this.toastr.warning('You do not have permission to delete aging codes.', 'Permission Denied');
      return;
    }
    if (!record?.id) {
      this.toastr.error('Unable to delete this aging code.', 'Error');
      return;
    }
    this.deleteTarget = record;
    this.deleteModalOpen = true;
  }

  closeDeleteModal(): void {
    if (this.deletingId) return;
    this.deleteModalOpen = false;
    this.deleteTarget = null;
  }

  saveAgingCode(): void {
    this.submitted = true;
    if (this.agingCodeForm.invalid) {
      return;
    }
    if (!this.activeCompanyId) {
      this.toastr.error('Select a company before saving aging codes.', 'Error');
      return;
    }
    const isEditing = this.editingRecordIndex !== null;
    if (isEditing && !this.canUpdateAgingCode) {
      this.toastr.warning('You do not have permission to update aging codes.', 'Permission Denied');
      return;
    }
    if (!isEditing && !this.canCreateAgingCode) {
      this.toastr.warning('You do not have permission to create aging codes.', 'Permission Denied');
      return;
    }

    const formValue = this.agingCodeForm.value;
    const payload: AgingCodePayload = {
      bucketName: (formValue.bucketName ?? '').trim(),
      startDay: Number(formValue.startDay ?? 0),
      endDay: Number(formValue.endDay ?? 0),
      displayOrder: Number(formValue.displayOrder ?? 0),
    };

    if (!payload.bucketName) {
      this.toastr.error('Bucket name is required.', 'Error');
      return;
    }

    let request$;

    if (isEditing) {
      const agingCodeId = this.editingRecordOriginal?.id;
      if (!agingCodeId) {
        this.toastr.error('Unable to identify the aging code to update.', 'Error');
        return;
      }
      const updates = this.buildUpdatePayload(payload);
      if (Object.keys(updates).length === 0) {
        this.toastr.info('No changes detected.', 'Aging Code');
        return;
      }
      request$ = this.agingCodeService.updateAgingCode(agingCodeId, updates);
    } else {
      request$ = this.agingCodeService.createAgingCode(this.activeCompanyId, payload);
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
          this.toastr.success(`Aging code ${action} successfully.`, 'Success');
          this.modalOpen = false;
          this.submitted = false;
          this.editingRecordIndex = null;
          this.editingRecordOriginal = null;
          this.loadRecords();
        },
        error: (error) => {
          const message = error?.error?.message || 'Unable to save aging code. Please try again.';
          this.toastr.error(message, 'Error');
        },
      });
  }

  confirmDelete(): void {
    if (!this.canDeleteAgingCode) {
      this.toastr.warning('You do not have permission to delete aging codes.', 'Permission Denied');
      return;
    }
    if (!this.deleteTarget?.id) {
      this.toastr.error('Unable to delete this aging code.', 'Error');
      return;
    }
    this.deletingId = this.deleteTarget.id;
    this.agingCodeService
      .deleteAgingCode(this.deleteTarget.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.deletingId = null;
          this.deleteModalOpen = false;
          this.deleteTarget = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Aging code deleted successfully.', 'Success');
          this.loadRecords();
        },
        error: () => {
          this.toastr.error('Unable to delete aging code. Please try again.', 'Error');
        },
      });
  }

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

  get pagedRecords(): AgingCodeRecord[] {
    if (this.records.length === 0) {
      return [];
    }
    const start = this.currentPage * this.pageSize;
    return this.records.slice(start, start + this.pageSize);
  }

  formatRange(record: AgingCodeRecord): string {
    const start = Number(record.startDay ?? 0);
    const end = Number(record.endDay ?? 0);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return '—';
    }
    return `${start} - ${end} days`;
  }

  trackByRecordId(index: number, record: AgingCodeRecord): number | string {
    return record.id ?? `${record.bucketName}-${index}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private syncPermissions() {
    this.canViewAgingCode = this.userContext.hasPermission('VIEW_AGING_CODE');
    this.canCreateAgingCode = this.userContext.hasPermission('CREATE_AGING_CODE');
    this.canUpdateAgingCode = this.userContext.hasPermission('UPDATE_AGING_CODE');
    this.canDeleteAgingCode = this.userContext.hasPermission('DELETE_AGING_CODE');
  }

  private validateRange() {
    return (group: AbstractControl): ValidationErrors | null => {
      const start = Number(group.get('startDay')?.value);
      const end = Number(group.get('endDay')?.value);
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return null;
      }
      return start <= end ? null : { rangeInvalid: true };
    };
  }

  private buildUpdatePayload(payload: AgingCodePayload): Partial<AgingCodePayload> {
    if (!this.editingRecordOriginal) {
      return payload;
    }

    const updates: Partial<AgingCodePayload> = {};
    const original = this.editingRecordOriginal;

    if ((payload.bucketName ?? '').trim() !== (original.bucketName ?? '').trim()) {
      updates.bucketName = payload.bucketName;
    }
    if (Number(payload.startDay) !== Number(original.startDay)) {
      updates.startDay = payload.startDay;
    }
    if (Number(payload.endDay) !== Number(original.endDay)) {
      updates.endDay = payload.endDay;
    }
    if (Number(payload.displayOrder) !== Number(original.displayOrder)) {
      updates.displayOrder = payload.displayOrder;
    }

    return updates;
  }
}
