import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ArCodeService } from '../../services/ar-code-service';
import {
  CreateArCodePayload,
  ArCodeEntity,
  UpdateArCodePayload,
  ArGlMappingPayload,
  ArGlMappingEntity,
} from '../../models/ar-code.model';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import { UserContextService } from '../../services/user-context.service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { GlCodeService } from '../../services/gl-code-service';
import { GlCodeEntity } from '../../models/gl-code.model';

type ArCodeStatus = 'ACTIVE' | 'INACTIVE';

interface ArCodeRecord {
  id?: number;
  arCode: string;
  codeName: string;
  codeType?: string;
  description: string;
  glMappingStatus?: string;
  status: ArCodeStatus;
}

type GlCodeOption = {
  id: number;
  label: string;
};

@Component({
  selector: 'app-ar-codes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Loader, Spinner],
  templateUrl: './ar-codes.html',
  styleUrl: './ar-codes.css',
})
export class ArCodes implements OnInit, OnDestroy {
  records: ArCodeRecord[] = [];
  arCodeForm: FormGroup;
  glMappingForm: FormGroup;
  modalOpen = false;
  submitted = false;
  editingRecordIndex: number | null = null;
  saving = false;
  loading = true;
  deleteModalOpen = false;
  deleteTargetIndex: number | null = null;
  deleting = false;
  canViewArCodes = false;
  canCreateArCode = false;
  canUpdateArCode = false;
  canDeleteArCode = false;
  showActionsColumn = false;
  hasGlCodes = false;
  checkingGlCodes = false;
  readonly glCodeRequirementMessage = 'Create at least one GL code before adding AR codes.';
  readonly glMappingLabels: Record<
    string,
    {
      label: string;
      variant: 'configured' | 'missing';
    }
  > = {
    CONFIGURED: { label: 'Configured', variant: 'configured' },
    COMPLETE: { label: 'Configured', variant: 'configured' },
    MISSING: { label: 'Click to Map', variant: 'missing' },
  };
  private deletingCodeIds = new Set<number>();
  private togglingCodeIds = new Set<number>();
  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  glCodeOptions: GlCodeOption[] = [];
  mappingModalOpen = false;
  mappingSubmitted = false;
  mappingSaving = false;
  mappingPrefillLoading = false;
  mappingTarget: ArCodeRecord | null = null;
  readonly mappingInfoText =
    'GL mapping is required before posting transactions. Draft transactions do not require mapping.';
  private userId: number | null = null;
  private mappingInitialValues: {
    debitGlCodeId: number | null;
    creditGlCodeId: number | null;
  } | null = null;
  currentPage = 0;
  totalPages = 0;
  totalItems = 0;
  readonly defaultPageSize = 10;
  pageSize = this.defaultPageSize;
  Math = Math;

  readonly statusOptions = [
    { label: 'Active', value: 'ACTIVE' as ArCodeStatus },
    { label: 'Inactive', value: 'INACTIVE' as ArCodeStatus },
  ];

  readonly codeTypeOptions = [
    { label: 'Bank Cash', value: 'BANK_CASH' },
    { label: 'GL', value: 'GL' },
    { label: 'Adjust Reason', value: 'ADJUST_REASON' },
    { label: 'Dispute', value: 'DISPUTE' },
    { label: 'Memo', value: 'MEMO' },
    { label: 'Customer Class', value: 'CUSTOMER_CLASS' },
    { label: 'Sales Rep', value: 'SALES_REP' },
    { label: 'Territory', value: 'TERRITORY' },
    { label: 'Category', value: 'CATEGORY' },
    { label: 'Aging', value: 'AGING' },
    { label: 'Dunning', value: 'DUNNING' },
    { label: 'Promise to Pay', value: 'PROMISE_TO_PAY' },
    { label: 'Hold', value: 'HOLD' },
    { label: 'Cycle', value: 'CYCLE' },
    { label: 'Operator', value: 'OPERATOR' },
  ];

  constructor(
    private fb: FormBuilder,
    private arCodeService: ArCodeService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private userContext: UserContextService,
    private companySelection: CompanySelectionService,
    private glCodeService: GlCodeService
  ) {
    this.canViewArCodes = this.userContext.hasPermission('VIEW_AR_CODE');
    this.canCreateArCode = this.userContext.hasPermission('CREATE_AR_CODE');
    this.canUpdateArCode = this.userContext.hasPermission('UPDATE_AR_CODE');
    this.canDeleteArCode = this.userContext.hasPermission('DELETE_AR_CODE');
    this.showActionsColumn = this.canUpdateArCode || this.canDeleteArCode;
    this.userId = this.userContext.getUserId();

    this.arCodeForm = this.fb.group({
      arCode: ['', [Validators.required, Validators.maxLength(50)]],
      codeName: ['', [Validators.required, Validators.maxLength(100)]],
      codeType: ['', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(200)]],
    });

    this.glMappingForm = this.fb.group({
      debitGlCodeId: ['', Validators.required],
      creditGlCodeId: ['', Validators.required],
    });
  }

  ngOnInit() {
    if (!this.canViewArCodes) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      const nextCompanyId = this.normalizeCompanyId(value);
      if (this.activeCompanyId === nextCompanyId) {
        if (nextCompanyId && this.records.length === 0 && !this.loading) {
          this.fetchArCodes();
        }
        return;
      }
      this.activeCompanyId = nextCompanyId;
      if (!this.activeCompanyId) {
        this.records = [];
        this.loading = false;
        this.hasGlCodes = false;
        this.glCodeOptions = [];
        this.currentPage = 0;
        this.totalPages = 0;
        this.totalItems = 0;
        this.pageSize = this.defaultPageSize;
        this.cdr.detectChanges();
        return;
      }
      this.verifyGlCodeRequirement();
      this.currentPage = 0;
      this.fetchArCodes(0);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openModal() {
    if (!this.canCreateArCode) {
      return;
    }
    if (!this.hasGlCodes) {
      this.toastr.warning(this.glCodeRequirementMessage, 'GL code required');
      return;
    }
    this.arCodeForm.reset();
    this.submitted = false;
    this.editingRecordIndex = null;
    this.saving = false;
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.modalOpen = false;
    this.submitted = false;
    this.editingRecordIndex = null;
    this.saving = false;
    this.cdr.detectChanges();
  }

  saveArCode() {
    this.submitted = true;
    if (this.arCodeForm.invalid || this.saving) {
      return;
    }

    const formValue = this.arCodeForm.value;
    const sanitize = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const editingRecord =
      this.editingRecordIndex !== null ? this.records[this.editingRecordIndex] : null;

    const newCode: ArCodeRecord = {
      id: editingRecord?.id,
      arCode: sanitize(formValue.arCode),
      codeName: sanitize(formValue.codeName),
      codeType: formValue.codeType || undefined,
      description: sanitize(formValue.description),
      status: editingRecord?.status ?? 'ACTIVE',
    };

    const companyId = this.activeCompanyId;
    if (!companyId) {
      this.toastr.warning('Select a company before managing AR codes.', 'Company Required');
      return;
    }

    if (this.editingRecordIndex !== null && editingRecord) {
      if (!this.canUpdateArCode) {
        this.toastr.error('You do not have permission to update AR codes.', 'Permission denied');
        return;
      }
      if (!editingRecord.id) {
        this.toastr.error(
          'Unable to update this AR code. Please refresh the page and try again.',
          'Error'
        );
        return;
      }

      const updatePayload = this.buildUpdatePayload(editingRecord, newCode);
      if (Object.keys(updatePayload).length === 0) {
        this.toastr.info('No changes detected to update.', 'No changes');
        this.closeModal();
        return;
      }

      this.saving = true;
      this.arCodeService
        .updateCode(editingRecord.id, companyId, updatePayload)
        .pipe(
          finalize(() => {
            this.saving = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: (response) => {
            this.toastr.success(response?.message ?? 'AR code updated successfully', 'Success');
            this.closeModal();
            this.fetchArCodes();
          },
          error: (error) => {
            console.error('Failed to update AR code', error);
            this.toastr.error('Failed to update AR code. Please try again.', 'Error');
          },
        });
      return;
    }

    if (!this.canCreateArCode) {
      this.toastr.error('You do not have permission to create AR codes.', 'Permission denied');
      return;
    }
    if (!this.hasGlCodes) {
      this.toastr.warning(this.glCodeRequirementMessage, 'GL code required');
      return;
    }

    // Create payload with codeType
    const payload: CreateArCodePayload = {
      code: newCode.arCode,
      name: newCode.codeName,
      codeType: newCode.codeType!,
      description: newCode.description,
    };

    this.saving = true;
    this.arCodeService
      .createCode(payload, companyId)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message ?? 'AR code created successfully', 'Success');
          this.closeModal();
          const createdEntity = response?.data;
          if (createdEntity) {
            this.insertCreatedRecord(this.mapEntityToRecord(createdEntity));
          } else {
            console.warn('Create AR code response did not include data');
            this.fetchArCodes();
          }
        },
        error: (error) => {
          console.error('Failed to create AR code', error);
          this.toastr.error('Failed to create AR code. Please try again.', 'Error');
        },
      });
  }

  editArCode(index: number) {
    if (!this.canUpdateArCode) {
      return;
    }
    const record = this.records[index];
    if (!record) {
      return;
    }
    this.editingRecordIndex = index;
    this.arCodeForm.setValue({
      arCode: record.arCode,
      codeName: record.codeName,
      codeType: record.codeType || '',
      description: record.description,
    });
    this.submitted = false;
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  openDeleteModal(index: number) {
    if (!this.canDeleteArCode) {
      return;
    }
    const record = this.records[index];
    if (!record) {
      return;
    }
    this.deleteTargetIndex = index;
    this.deleteModalOpen = true;
    this.deleting = false;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.deleteModalOpen = false;
    this.deleteTargetIndex = null;
    this.deleting = false;
    this.cdr.detectChanges();
  }

  confirmDelete() {
    if (this.deleteTargetIndex === null) {
      return;
    }
    const record = this.records[this.deleteTargetIndex];
    if (!record) {
      this.closeDeleteModal();
      return;
    }

    if (!this.canDeleteArCode) {
      this.toastr.error('You do not have permission to delete AR codes.', 'Permission denied');
      this.closeDeleteModal();
      return;
    }

    this.performDelete(record, this.deleteTargetIndex);
  }

  private performDelete(record: ArCodeRecord, index: number) {
    if (!record.id) {
      const nextRecords = [...this.records];
      nextRecords.splice(index, 1);
      this.records = nextRecords;
      if (this.editingRecordIndex !== null) {
        if (index === this.editingRecordIndex) {
          this.closeModal();
        } else if (index < this.editingRecordIndex) {
          this.editingRecordIndex = this.editingRecordIndex - 1;
        }
      }
      this.toastr.success('AR code deleted successfully', 'Success');
      this.closeDeleteModal();
      this.cdr.detectChanges();
      return;
    }

    const companyId = this.activeCompanyId;
    if (!companyId) {
      this.toastr.warning('Select a company before managing AR codes.', 'Company Required');
      return;
    }

    if (this.deletingCodeIds.has(record.id)) {
      return;
    }

    this.deleting = true;
    this.deletingCodeIds.add(record.id);
    this.cdr.detectChanges();

    const editingRecordId =
      this.editingRecordIndex !== null ? this.records[this.editingRecordIndex]?.id : null;

    this.arCodeService
      .deleteCode(record.id, companyId)
      .pipe(
        finalize(() => {
          this.deleting = false;
          this.deletingCodeIds.delete(record.id as number);
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message ?? 'AR code deleted successfully', 'Success');
          if (editingRecordId === record.id) {
            this.closeModal();
          }
          this.closeDeleteModal();
          this.fetchArCodes();
        },
        error: (error) => {
          console.error('Failed to delete AR code', error);
          this.toastr.error('Failed to delete AR code. Please try again.', 'Error');
        },
      });
  }

  toggleStatus(record: ArCodeRecord, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!record?.id) {
      this.toastr.error(
        'Unable to toggle status for this AR code yet. Please refresh and try again.',
        'Error'
      );
      return;
    }

    if (this.isTogglingStatus(record.id) || this.isDeleting(record.id)) {
      return;
    }
    if (!this.canUpdateArCode) {
      this.toastr.error('You do not have permission to update AR codes.', 'Permission denied');
      return;
    }

    const companyId = this.activeCompanyId;
    if (!companyId) {
      this.toastr.warning('Select a company before managing AR codes.', 'Company Required');
      return;
    }

    const targetActive = record.status !== 'ACTIVE';
    this.togglingCodeIds.add(record.id);
    this.cdr.detectChanges();

    const toggle$ = targetActive
      ? this.arCodeService.activateCode(record.id, companyId)
      : this.arCodeService.deactivateCode(record.id, companyId);

    toggle$
      .pipe(
        finalize(() => {
          this.togglingCodeIds.delete(record.id as number);
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const updatedRecord: ArCodeRecord = response?.data
            ? this.mapEntityToRecord(response.data)
            : { ...record, status: (targetActive ? 'ACTIVE' : 'INACTIVE') as ArCodeStatus };
          this.records = this.records.map(
            (existing): ArCodeRecord => (existing.id === record.id ? updatedRecord : existing)
          );
          const message =
            response?.message ??
            (targetActive ? 'AR code activated successfully' : 'AR code inactivated successfully');
          this.toastr.success(message, 'Success');
          this.fetchArCodes();
        },
        error: (error) => {
          console.error('Failed to toggle AR code status', error);
          this.toastr.error('Failed to update status. Please try again.', 'Error');
        },
      });
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    if (total <= 0) {
      return pages;
    }
    const current = this.currentPage + 1;
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current <= 3) {
        pages.push(2, 3, 4, -1, total);
      } else if (current >= total - 2) {
        pages.push(-1, total - 3, total - 2, total - 1, total);
      } else {
        pages.push(-1, current - 1, current, current + 1, -1, total);
      }
    }
    return pages;
  }

  goToPage(page: number) {
    if (
      this.activeCompanyId &&
      page >= 0 &&
      page < this.totalPages &&
      page !== this.currentPage
    ) {
      this.fetchArCodes(page);
    }
  }

  nextPage() {
    if (this.activeCompanyId && this.currentPage < this.totalPages - 1) {
      this.fetchArCodes(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.activeCompanyId && this.currentPage > 0) {
      this.fetchArCodes(this.currentPage - 1);
    }
  }

  getStatusLabel(status: ArCodeStatus): string {
    return status === 'ACTIVE' ? 'Active' : 'Inactive';
  }

  // Get formatted label for code type
  getCodeTypeLabel(codeType: string | undefined): string {
    if (!codeType) return '—';
    const option = this.codeTypeOptions.find((opt) => opt.value === codeType);
    return option ? option.label : codeType;
  }

  getGlMappingMeta(status?: string) {
    if (!status) {
      return { label: 'Unknown', variant: 'missing' as const };
    }
    return this.glMappingLabels[status] ?? { label: status, variant: 'missing' as const };
  }

  private hasConfiguredGlMapping(status?: string | null): boolean {
    if (!status) {
      return false;
    }
    const normalized = status.toUpperCase();
    return normalized === 'CONFIGURED' || normalized === 'COMPLETE';
  }

  private loadExistingGlMapping(arCodeId: number) {
    this.mappingPrefillLoading = true;
    this.cdr.detectChanges();

    this.arCodeService
      .getArGlMapping(arCodeId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.mappingPrefillLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const mapping = this.resolveGlMappingRecord(response?.data, arCodeId);
          if (mapping) {
            const debitId = this.normalizeGlCodeId(mapping.debitGlCode?.id);
            const creditId = this.normalizeGlCodeId(mapping.creditGlCode?.id);
            this.mappingInitialValues = {
              debitGlCodeId: debitId,
              creditGlCodeId: creditId,
            };
            this.glMappingForm.patchValue({
              debitGlCodeId: debitId ?? '',
              creditGlCodeId: creditId ?? '',
            });
          }
        },
        error: (error) => {
          console.error('Failed to load AR → GL mapping', error);
          this.toastr.error('Failed to load GL mapping. Please try again.', 'Error');
        },
      });
  }

  private resolveGlMappingRecord(
    data: ArGlMappingEntity | ArGlMappingEntity[] | undefined,
    arCodeId: number
  ): ArGlMappingEntity | null {
    const records = this.normalizeGlMappingData(data);
    if (records.length === 0) {
      return null;
    }
    return (
      records.find((record) => record?.arCode?.id === arCodeId && record?.active) ??
      records.find((record) => record?.arCode?.id === arCodeId) ??
      records[0]
    );
  }

  private normalizeGlMappingData(
    data: ArGlMappingEntity | ArGlMappingEntity[] | undefined | null
  ): ArGlMappingEntity[] {
    if (!data) {
      return [];
    }
    return Array.isArray(data) ? data : [data];
  }

  private normalizeGlCodeId(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private hasMappingChanges(selectedDebit: number | null, selectedCredit: number | null): boolean {
    if (!this.mappingInitialValues) {
      return true;
    }
    return (
      this.mappingInitialValues.debitGlCodeId !== selectedDebit ||
      this.mappingInitialValues.creditGlCodeId !== selectedCredit
    );
  }

  openGlMappingModal(record: ArCodeRecord) {
    if (!record?.id) {
      this.toastr.error('Unable to configure GL mapping for this AR code yet.', 'Error');
      return;
    }
    if (!this.hasGlCodes || this.glCodeOptions.length === 0) {
      this.toastr.warning('Create GL codes before configuring mappings.', 'GL code required');
      return;
    }
    this.mappingTarget = record;
    this.mappingSubmitted = false;
    this.mappingSaving = false;
    this.mappingPrefillLoading = false;
    this.mappingInitialValues = { debitGlCodeId: null, creditGlCodeId: null };
    this.glMappingForm.reset({
      debitGlCodeId: '',
      creditGlCodeId: '',
    });
    this.mappingModalOpen = true;
    this.cdr.detectChanges();

    if (this.hasConfiguredGlMapping(record.glMappingStatus)) {
      this.loadExistingGlMapping(record.id);
    }
  }

  closeGlMappingModal() {
    this.mappingModalOpen = false;
    this.mappingSubmitted = false;
    this.mappingSaving = false;
    this.mappingTarget = null;
    this.mappingPrefillLoading = false;
    this.mappingInitialValues = null;
    this.glMappingForm.reset();
    this.cdr.detectChanges();
  }

  saveGlMapping() {
    this.mappingSubmitted = true;
    if (this.glMappingForm.invalid || this.mappingSaving) {
      return;
    }

    const record = this.mappingTarget;
    if (!record?.id) {
      this.toastr.error('Select an AR code before saving GL mapping.', 'Error');
      return;
    }

    const companyId = this.activeCompanyId;
    if (!companyId) {
      this.toastr.warning('Select a company before configuring GL mapping.', 'Company required');
      return;
    }

    const userId = this.userId;
    if (!userId) {
      this.toastr.error('Unable to determine active user. Please sign in again.', 'User required');
      return;
    }

    const selectedDebitId = this.normalizeGlCodeId(this.glMappingForm.value.debitGlCodeId);
    const selectedCreditId = this.normalizeGlCodeId(this.glMappingForm.value.creditGlCodeId);

    if (selectedDebitId === null || selectedCreditId === null) {
      return;
    }

    if (!this.hasMappingChanges(selectedDebitId, selectedCreditId)) {
      this.toastr.info('No changes detected for GL mapping.', 'No changes');
      this.closeGlMappingModal();
      return;
    }

    this.mappingSaving = true;

    // Check if mapping is already configured
    const isConfigured = this.hasConfiguredGlMapping(record.glMappingStatus);

    let apiCall$;

    if (isConfigured) {
      // UPDATE: Only send debitGlCodeId and creditGlCodeId
      const updatePayload = {
        debitGlCodeId: selectedDebitId,
        creditGlCodeId: selectedCreditId,
      };
      apiCall$ = this.arCodeService.updateArGlMapping(record.id, companyId, userId, updatePayload);
    } else {
      // CREATE: Send arCodeId, debitGlCodeId, and creditGlCodeId
      const createPayload: ArGlMappingPayload = {
        arCodeId: record.id,
        debitGlCodeId: selectedDebitId,
        creditGlCodeId: selectedCreditId,
      };
      apiCall$ = this.arCodeService.arglMapping(companyId, userId, createPayload);
    }

    apiCall$
      .pipe(
        finalize(() => {
          this.mappingSaving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message ?? 'GL mapping saved successfully', 'Success');
          this.closeGlMappingModal();
          this.fetchArCodes();
        },
        error: (error) => {
          console.error('Failed to save GL mapping', error);
          this.toastr.error('Failed to save GL mapping. Please try again.', 'Error');
        },
      });
  }

  private mapEntityToRecord(entity: ArCodeEntity): ArCodeRecord {
    return {
      id: entity.id,
      arCode: entity.code,
      codeName: entity.name,
      codeType: (entity as any).codeType,
      description: entity.description,
      glMappingStatus: (entity as any).glMappingStatus,
      status: entity.active ? 'ACTIVE' : 'INACTIVE',
    };
  }

  private buildUpdatePayload(original: ArCodeRecord, updated: ArCodeRecord): UpdateArCodePayload {
    const payload: UpdateArCodePayload = {};

    if (original.arCode !== updated.arCode) {
      payload.code = updated.arCode;
    }
    if (original.codeName !== updated.codeName) {
      payload.name = updated.codeName;
    }
    if (original.codeType !== updated.codeType && updated.codeType) {
      payload.codeType = updated.codeType;
    }
    if (original.description !== updated.description) {
      payload.description = updated.description;
    }

    return payload;
  }

  isDeleting(codeId?: number): boolean {
    return typeof codeId === 'number' && this.deletingCodeIds.has(codeId);
  }

  isTogglingStatus(codeId?: number): boolean {
    return typeof codeId === 'number' && this.togglingCodeIds.has(codeId);
  }

  private fetchArCodes(page?: number) {
    if (!this.activeCompanyId) {
      this.records = [];
      this.loading = false;
      this.totalItems = 0;
      this.totalPages = 0;
      this.currentPage = 0;
      this.cdr.detectChanges();
      return;
    }

    const targetPage = typeof page === 'number' && page >= 0 ? page : this.currentPage;
    const requestedPageSize = this.pageSize || this.defaultPageSize;

    this.loading = true;
    this.cdr.detectChanges();

    this.arCodeService
      .getCodesPage(this.activeCompanyId, targetPage, requestedPageSize)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const responseData = response?.data;
          if (Array.isArray(responseData)) {
            this.records = responseData.map((entity) => this.mapEntityToRecord(entity));
            this.totalItems = this.records.length;
            this.totalPages = this.records.length ? 1 : 0;
            this.currentPage = 0;
            this.pageSize = this.records.length || this.defaultPageSize;
            this.cdr.detectChanges();
            return;
          }
          if (responseData && !('content' in responseData) && (responseData as any).id) {
            this.records = [this.mapEntityToRecord(responseData as ArCodeEntity)];
            this.totalItems = 1;
            this.totalPages = 1;
            this.currentPage = 0;
            this.pageSize = 1;
            this.cdr.detectChanges();
            return;
          }
          const pageData = responseData;
          const content = pageData?.content ?? [];
          const totalPages = pageData?.totalPages ?? (content.length ? 1 : 0);
          const totalItems = pageData?.totalElements ?? content.length;
          const normalizedPageSize = pageData?.size ?? requestedPageSize;
          const maxPageIndex = totalPages > 0 ? totalPages - 1 : 0;
          const responsePageNumber =
            typeof pageData?.number === 'number' ? pageData.number : targetPage;
          const normalizedPage = totalPages
            ? Math.min(Math.max(responsePageNumber, 0), maxPageIndex)
            : 0;

          if (totalPages > 0 && responsePageNumber !== normalizedPage) {
            this.fetchArCodes(normalizedPage);
            return;
          }

          this.records = content.map((entity) => this.mapEntityToRecord(entity));
          this.totalPages = totalPages;
          this.totalItems = totalItems;
          this.currentPage = normalizedPage;
          this.pageSize = normalizedPageSize;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Failed to load AR codes', error);
          this.toastr.error('Failed to load AR codes. Please try again.', 'Error');
        },
      });
  }

  private normalizeCompanyId(value: string | number | null): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private verifyGlCodeRequirement() {
    if (!this.canCreateArCode) {
      this.hasGlCodes = true;
      this.checkingGlCodes = false;
      this.cdr.detectChanges();
      return;
    }
    const companyId = this.activeCompanyId;
    if (!companyId) {
      this.hasGlCodes = false;
      this.checkingGlCodes = false;
      this.cdr.detectChanges();
      return;
    }

    this.checkingGlCodes = true;
    this.cdr.detectChanges();

    this.glCodeService
      .getGlCode(companyId)
      .pipe(
        finalize(() => {
          this.checkingGlCodes = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const glCodes = Array.isArray(response?.data) ? response.data : [];
          this.hasGlCodes = glCodes.length > 0;
          this.glCodeOptions = glCodes.map((code) => this.toGlCodeOption(code));
        },
        error: (error) => {
          console.error('Failed to verify GL codes', error);
          this.hasGlCodes = false;
          this.glCodeOptions = [];
          this.toastr.error('Failed to verify GL codes. Please try again.', 'Error');
        },
      });
  }

  private toGlCodeOption(entity: GlCodeEntity): GlCodeOption {
    const labelParts = [entity.glCode, entity.description].filter(Boolean);
    return {
      id: entity.id,
      label: labelParts.join(' - '),
    };
  }

  private insertCreatedRecord(record: ArCodeRecord) {
    const effectivePageSize = this.pageSize || this.defaultPageSize;
    const nextRecords = [record, ...this.records];
    if (nextRecords.length > effectivePageSize && effectivePageSize > 0) {
      nextRecords.pop();
    }
    this.records = nextRecords;
    this.totalItems = (this.totalItems || 0) + 1;
    const computedPages =
      effectivePageSize > 0 ? Math.ceil(this.totalItems / effectivePageSize) : 0;
    this.totalPages = this.totalItems > 0 ? Math.max(computedPages, 1) : 0;
    this.cdr.detectChanges();
  }
}
