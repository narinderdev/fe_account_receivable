import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import { GlCodeService } from '../../services/gl-code-service';
import { CreateGlCodePayload, GlCodeEntity, UpdateGlCodePayload } from '../../models/gl-code.model';
import { UserContextService } from '../../services/user-context.service';
import { CompanySelectionService } from '../../services/company-selection.service';

type GlCodeStatus = 'ACTIVE' | 'INACTIVE';

interface GlCodeRecord {
  id?: number;
  glCode: string;
  description: string;
  accountType: string;
  status: GlCodeStatus;
}

const maxWordsValidator = (maxWords: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';
    if (!value) {
      return null;
    }
    const wordCount = value.split(/\s+/).filter(Boolean).length;
    if (wordCount <= maxWords) {
      return null;
    }
    return {
      maxWords: {
        maxWords,
        actualWords: wordCount,
      },
    };
  };
};

@Component({
  selector: 'app-gl-code',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Loader, Spinner],
  templateUrl: './gl-code.html',
  styleUrl: './gl-code.css',
})
export class GlCode implements OnInit, OnDestroy {
  records: GlCodeRecord[] = [];
  glCodeForm: FormGroup;
  modalOpen = false;
  submitted = false;
  editingRecordIndex: number | null = null;
  saving = false;
  loading = true;
  canViewGlCodes = false;
  canCreateGlCode = false;
  canUpdateGlCode = false;
  showActionsColumn = false;
  readonly statementText = 'GL Codes cannot be deleted once used in transactions.';
  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  private userId: number | null = null;

  readonly accountTypeOptions = [
    { label: 'Accounts Receivable', value: 'AR' },
    { label: 'Cash / Bank', value: 'CASH' },
    { label: 'Revenue', value: 'REVENUE' },
    { label: 'Expense', value: 'EXPENSE' },
  ];

  constructor(
    private fb: FormBuilder,
    private glCodeService: GlCodeService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private userContext: UserContextService,
    private companySelection: CompanySelectionService
  ) {
    this.canViewGlCodes = this.userContext.hasPermission('VIEW_GL_CODE');
    this.canCreateGlCode = this.userContext.hasPermission('CREATE_GL_CODE');
    this.canUpdateGlCode = this.userContext.hasPermission('UPDATE_GL_CODE');
    this.showActionsColumn = this.canUpdateGlCode;
    this.userId = this.userContext.getUserId();

    this.glCodeForm = this.fb.group({
      glCode: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.required, maxWordsValidator(100)]],
      accountType: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    if (!this.canViewGlCodes) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      const nextCompanyId = this.normalizeCompanyId(value);
      if (this.activeCompanyId === nextCompanyId) {
        if (nextCompanyId && this.records.length === 0 && !this.loading) {
          this.fetchGlCodes();
        }
        return;
      }

      this.activeCompanyId = nextCompanyId;
      if (!this.activeCompanyId) {
        this.records = [];
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }
      this.fetchGlCodes();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openModal(): void {
    if (!this.canCreateGlCode) {
      return;
    }
    this.glCodeForm.reset();
    this.submitted = false;
    this.editingRecordIndex = null;
    this.saving = false;
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.modalOpen = false;
    this.submitted = false;
    this.editingRecordIndex = null;
    this.saving = false;
    this.cdr.detectChanges();
  }

  editGlCode(index: number): void {
    if (!this.canUpdateGlCode) {
      return;
    }
    const record = this.records[index];
    if (!record) {
      return;
    }
    this.editingRecordIndex = index;
    this.glCodeForm.setValue({
      glCode: record.glCode,
      description: record.description,
      accountType: record.accountType,
    });
    this.submitted = false;
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  saveGlCode(): void {
    this.submitted = true;
    if (this.glCodeForm.invalid || this.saving) {
      return;
    }

    const companyId = this.activeCompanyId;
    if (!companyId) {
      this.toastr.warning('Select a company before managing GL codes.', 'Company Required');
      return;
    }

    const userId = this.userId;
    if (!userId) {
      this.toastr.error(
        'Unable to determine the active user. Please sign in again and retry.',
        'User required'
      );
      return;
    }

    const formValue = this.glCodeForm.value;
    const sanitize = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const editingRecord =
      this.editingRecordIndex !== null ? this.records[this.editingRecordIndex] : null;

    const model: GlCodeRecord = {
      id: editingRecord?.id,
      glCode: sanitize(formValue.glCode),
      description: sanitize(formValue.description),
      accountType: formValue.accountType ?? '',
      status: editingRecord?.status ?? 'ACTIVE',
    };

    if (this.editingRecordIndex !== null && editingRecord) {
      if (!this.canUpdateGlCode) {
        this.toastr.error('You do not have permission to update GL codes.', 'Permission denied');
        return;
      }
      if (!editingRecord.id) {
        this.toastr.error(
          'Unable to update this GL code. Please refresh the page and try again.',
          'Error'
        );
        return;
      }

      const updatePayload = this.buildUpdatePayload(editingRecord, model);
      if (Object.keys(updatePayload).length === 0) {
        this.toastr.info('No changes detected to update.', 'No changes');
        this.closeModal();
        return;
      }

      this.saving = true;
      this.glCodeService
        .updateGlCode(editingRecord.id, companyId, updatePayload)
        .pipe(
          finalize(() => {
            this.saving = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: (response) => {
            this.toastr.success(response?.message ?? 'GL code updated successfully', 'Success');
            this.closeModal();
            this.fetchGlCodes();
          },
          error: (error) => {
            console.error('Failed to update GL code', error);
            this.toastr.error('Failed to update GL code. Please try again.', 'Error');
          },
        });
      return;
    }

    if (!this.canCreateGlCode) {
      this.toastr.error('You do not have permission to create GL codes.', 'Permission denied');
      return;
    }

    const payload: CreateGlCodePayload = {
      glCode: model.glCode,
      description: model.description,
      accountType: model.accountType,
    };

    this.saving = true;
    this.glCodeService
      .createGlCode(payload, companyId, userId)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message ?? 'GL code created successfully', 'Success');
          this.closeModal();
          this.fetchGlCodes();
        },
        error: (error) => {
          console.error('Failed to create GL code', error);
          this.toastr.error('Failed to create GL code. Please try again.', 'Error');
        },
      });
  }

  getAccountTypeLabel(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const match = this.accountTypeOptions.find((opt) => opt.value === value);
    return match ? match.label : value;
  }

  getStatusLabel(status: GlCodeStatus): string {
    return status === 'ACTIVE' ? 'Active' : 'Inactive';
  }

  private buildUpdatePayload(original: GlCodeRecord, updated: GlCodeRecord): UpdateGlCodePayload {
    const payload: UpdateGlCodePayload = {};
    if (original.glCode !== updated.glCode) {
      payload.glCode = updated.glCode;
    }
    if (original.description !== updated.description) {
      payload.description = updated.description;
    }
    if (original.accountType !== updated.accountType) {
      payload.accountType = updated.accountType;
    }
    return payload;
  }

  private mapEntityToRecord(entity: GlCodeEntity): GlCodeRecord {
    return {
      id: entity.id,
      glCode: entity.glCode,
      description: entity.description,
      accountType: entity.accountType,
      status: entity.active ? 'ACTIVE' : 'INACTIVE',
    };
  }

  private fetchGlCodes(): void {
    if (!this.activeCompanyId) {
      this.records = [];
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.glCodeService
      .getGlCode(this.activeCompanyId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const entities = Array.isArray(response?.data) ? response.data : [];
          this.records = entities.map((entity) => this.mapEntityToRecord(entity));
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Failed to load GL codes', error);
          this.toastr.error('Failed to load GL codes. Please try again.', 'Error');
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
}
