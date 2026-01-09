import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { ArCodeService } from '../../services/ar-code-service';
import { CreateArCodePayload, ArCodeEntity, UpdateArCodePayload } from '../../models/ar-code.model';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import { UserContextService } from '../../services/user-context.service';

type ArCodeStatus = 'ACTIVE' | 'INACTIVE';

interface ArCodeRecord {
  id?: number;
  arCode: string;
  codeName: string;
  description: string;
  status: ArCodeStatus;
}

const USER_CONTEXT_STORAGE_KEY = 'userContext';

@Component({
  selector: 'app-ar-codes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Loader, Spinner],
  templateUrl: './ar-codes.html',
  styleUrl: './ar-codes.css',
})
export class ArCodes implements OnInit {
  records: ArCodeRecord[] = [];
  arCodeForm: FormGroup;
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
  private deletingCodeIds = new Set<number>();
  private togglingCodeIds = new Set<number>();

  readonly statusOptions = [
    { label: 'Active', value: 'ACTIVE' as ArCodeStatus },
    { label: 'Inactive', value: 'INACTIVE' as ArCodeStatus },
  ];

  constructor(
    private fb: FormBuilder,
    private arCodeService: ArCodeService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private userContext: UserContextService
  ) {
    this.canViewArCodes = this.userContext.hasPermission('VIEW_CODE');
    this.canCreateArCode = this.userContext.hasPermission('CREATE_CODE');
    this.canUpdateArCode = this.userContext.hasPermission('UPDATE_CODE');
    this.canDeleteArCode = this.userContext.hasPermission('DELETE_CODE');
    this.showActionsColumn = this.canUpdateArCode || this.canDeleteArCode;

    this.arCodeForm = this.fb.group({
      arCode: ['', [Validators.required, Validators.maxLength(50)]],
      codeName: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(200)]],
    });
  }

  ngOnInit() {
    if (!this.canViewArCodes) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }
    this.fetchArCodes();
  }

  openModal() {
    if (!this.canCreateArCode) {
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
      description: sanitize(formValue.description),
      status: editingRecord?.status ?? 'ACTIVE', // Keep existing status or default to ACTIVE
    };

    const userId = this.getCurrentUserId();
    if (userId === null) {
      this.toastr.error(
        'Unable to determine the current user. Please sign in again.',
        'Missing user'
      );
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
        .updateCode(editingRecord.id, userId, updatePayload)
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

    // Create payload without status field
    const payload: CreateArCodePayload = {
      code: newCode.arCode,
      name: newCode.codeName,
      description: newCode.description,
    };

    this.saving = true;
    this.arCodeService
      .createCode(payload, userId)
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
          this.fetchArCodes();
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

    const userId = this.getCurrentUserId();
    if (userId === null) {
      this.toastr.error(
        'Unable to determine the current user. Please sign in again.',
        'Missing user'
      );
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
      .deleteCode(record.id, userId)
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

    const userId = this.getCurrentUserId();
    if (userId === null) {
      this.toastr.error(
        'Unable to determine the current user. Please sign in again.',
        'Missing user'
      );
      return;
    }

    const targetActive = record.status !== 'ACTIVE';
    this.togglingCodeIds.add(record.id);
    this.cdr.detectChanges();

    const toggle$ = targetActive
      ? this.arCodeService.activateCode(record.id, userId)
      : this.arCodeService.deactivateCode(record.id, userId);

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
        },
        error: (error) => {
          console.error('Failed to toggle AR code status', error);
          this.toastr.error('Failed to update status. Please try again.', 'Error');
        },
      });
  }

  getStatusLabel(status: ArCodeStatus): string {
    return status === 'ACTIVE' ? 'Active' : 'Inactive';
  }

  private getCurrentUserId(): number | null {
    const raw = localStorage.getItem(USER_CONTEXT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      return typeof parsed?.userId === 'number' ? parsed.userId : null;
    } catch {
      return null;
    }
  }

  private mapEntityToRecord(entity: ArCodeEntity): ArCodeRecord {
    return {
      id: entity.id,
      arCode: entity.code,
      codeName: entity.name,
      description: entity.description,
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
    if (original.description !== updated.description) {
      payload.description = updated.description;
    }
    // Status is no longer included in update payload - use toggle API instead

    return payload;
  }

  isDeleting(codeId?: number): boolean {
    return typeof codeId === 'number' && this.deletingCodeIds.has(codeId);
  }

  isTogglingStatus(codeId?: number): boolean {
    return typeof codeId === 'number' && this.togglingCodeIds.has(codeId);
  }

  private fetchArCodes() {
    const userId = this.getCurrentUserId();
    if (userId === null) {
      this.loading = false;
      this.toastr.error(
        'Unable to determine the current user. Please sign in again.',
        'Missing user'
      );
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.arCodeService
      .getCode(userId)
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
          console.error('Failed to load AR codes', error);
          this.toastr.error('Failed to load AR codes. Please try again.', 'Error');
        },
      });
  }
}
