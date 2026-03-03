import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import {
  BankAccountStatus,
  BankGlMappingEntity,
  CompanyBankAccountEntity,
  CreateBankAccountPayload,
  UpdateBankGlMappingPayload,
} from '../../models/bank-account.model';
import { BankAccountService } from '../../services/bank-account-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { GlCodeService } from '../../services/gl-code-service';
import { GlCodeEntity } from '../../models/gl-code.model';
import { UserContextService } from '../../services/user-context.service';

type MappingBadgeVariant = 'configured' | 'missing';

interface MappingMeta {
  label: string;
  variant: MappingBadgeVariant;
}

interface BankAccountRecord {
  id: number;
  bankName: string;
  accountNumber: string;
  currency: string | null;
  isDefault: boolean | null;
  mappingStatus: string | null;
}

interface GlCodeOption {
  id: number;
  label: string;
}

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Loader, Spinner],
  templateUrl: './accounts.html',
  styleUrl: './accounts.css',
})
export class Accounts implements OnInit, OnDestroy {
  private static readonly BANK_NAME_ALLOWED = /^[A-Za-z0-9\s.\-&,/()]+$/; // blocks special chars like @#$% etc.
  private static readonly ACCOUNT_NUMBER_ALLOWED = /^[0-9]+$/;

  records: BankAccountRecord[] = [];
  accountForm: FormGroup;
  mappingForm: FormGroup;
  loading = true;
  modalOpen = false;
  mappingModalOpen = false;
  submitted = false;
  saving = false;
  mappingSubmitted = false;
  mappingSaving = false;
  mappingPrefillLoading = false;
  glCodesLoading = false;

  glCodeOptions: GlCodeOption[] = [];

  readonly statusOptions = [
    { label: 'Active', value: 'ACTIVE' as BankAccountStatus },
    { label: 'Inactive', value: 'INACTIVE' as BankAccountStatus },
  ];

  readonly currencyOptions = [
    { label: 'USD', value: 'USD' },
    { label: 'GBP', value: 'GBP' },
  ] as const;

  readonly glCodeRequirementMessage = 'Create at least one GL code before mapping bank accounts.';
  readonly companySelectionMessage = 'Select an AR Company from the top navigation to view bank accounts.';
  readonly mappingInfoText =
    'Each bank account must be mapped to a GL code before it can be used in payments or postings.';
  readonly mappingStatusMeta: Record<string, MappingMeta> = {
    CONFIGURED: { label: 'Configured', variant: 'configured' },
    COMPLETE: { label: 'Configured', variant: 'configured' },
    MISSING: { label: 'Click to Map', variant: 'missing' },
  };

  private destroy$ = new Subject<void>();
  activeCompanyId: number | null = null;

  private mappingTarget: BankAccountRecord | null = null;
  private activeMappingId: number | null = null;
  private mappingInitialValues: { glCodeId: number | null; status: BankAccountStatus | null } | null =
    null;

  canViewAccounts = false;
  canCreateAccounts = false;
  canConfigureGlMapping = false;

  constructor(
    private fb: FormBuilder,
    private bankAccountService: BankAccountService,
    private companySelection: CompanySelectionService,
    private glCodeService: GlCodeService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private userContext: UserContextService
  ) {
    this.canViewAccounts =
      this.userContext.isAdmin() ||
      this.userContext.hasPermission('VIEW_BANK_ACCOUNT') ||
      this.userContext.hasPermission('VIEW_COMPANY');

    this.canCreateAccounts =
      this.userContext.isAdmin() ||
      this.userContext.hasPermission('CREATE_BANK_ACCOUNT') ||
      this.userContext.hasPermission('UPDATE_COMPANY');

    this.canConfigureGlMapping =
      this.userContext.isAdmin() ||
      this.userContext.hasPermission('UPDATE_BANK_ACCOUNT') ||
      this.userContext.hasPermission('UPDATE_COMPANY');

    this.accountForm = this.fb.group({
      bankName: [
        '',
        [
          Validators.required,
          Validators.maxLength(100),
          Validators.pattern(Accounts.BANK_NAME_ALLOWED),
        ],
      ],
      accountNumber: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          Validators.pattern(Accounts.ACCOUNT_NUMBER_ALLOWED),
        ],
      ],
      address: ['', [Validators.maxLength(150)]],
      branch: ['', [Validators.maxLength(100)]],
      currency: ['', [Validators.required]],
    });

    this.mappingForm = this.fb.group({
      glCodeId: ['', Validators.required],
      status: ['ACTIVE', Validators.required],
    });
  }

  ngOnInit(): void {
    if (!this.canViewAccounts) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      const nextCompanyId = this.normalizeCompanyId(value);
      if (this.activeCompanyId === nextCompanyId) {
        if (nextCompanyId && this.records.length === 0 && !this.loading) {
          this.fetchBankAccounts();
        }
        return;
      }

      this.activeCompanyId = nextCompanyId;
      this.resetMappingState();
      this.records = [];

      if (!this.activeCompanyId) {
        this.loading = false;
        this.glCodeOptions = [];
        this.cdr.detectChanges();
        return;
      }

      this.fetchBankAccounts();
      this.loadGlCodes(this.activeCompanyId);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Input filters (better UX; still validated by validators)
  onBankNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^A-Za-z0-9\s.\-&,/()]/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      this.accountForm.get('bankName')?.setValue(cleaned, { emitEvent: false });
    }
  }

  onAccountNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^0-9]/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      this.accountForm.get('accountNumber')?.setValue(cleaned, { emitEvent: false });
    }
  }

  openAccountModal(): void {
    if (!this.canCreateAccounts) {
      this.toastr.warning('You do not have permission to add bank accounts.', 'Permission denied');
      return;
    }
    if (!this.activeCompanyId) {
      this.toastr.warning(this.companySelectionMessage, 'Company required');
      return;
    }
    if (this.glCodeOptions.length === 0) {
      this.toastr.warning(this.glCodeRequirementMessage, 'GL code required');
      return;
    }
    this.accountForm.reset();
    this.submitted = false;
    this.saving = false;
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  closeAccountModal(): void {
    this.modalOpen = false;
    this.submitted = false;
    this.saving = false;
    this.accountForm.reset();
    this.cdr.detectChanges();
  }

  saveBankAccount(): void {
    this.submitted = true;
    if (this.accountForm.invalid || this.saving) {
      return;
    }
    const companyId = this.activeCompanyId;
    if (!companyId) {
      this.toastr.warning(this.companySelectionMessage, 'Company required');
      return;
    }

    const payload = this.buildCreatePayload(this.accountForm.value);
    this.saving = true;

    this.bankAccountService
      .createBankAccount(companyId, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message ?? 'Bank account saved successfully.', 'Success');
          this.closeAccountModal();
          this.fetchBankAccounts();
        },
        error: (error) => {
          console.error('Failed to save bank account', error);
          this.toastr.error('Failed to save bank account. Please try again.', 'Error');
        },
      });
  }

  openGlMappingModal(record: BankAccountRecord): void {
    if (!this.canConfigureGlMapping) {
      this.toastr.warning('You do not have permission to configure GL mapping.', 'Permission denied');
      return;
    }
    if (!this.activeCompanyId) {
      this.toastr.warning(this.companySelectionMessage, 'Company required');
      return;
    }
    const mappingConfigured = this.hasConfiguredMapping(record.mappingStatus);
    if (!mappingConfigured && this.glCodeOptions.length === 0) {
      this.toastr.warning(this.glCodeRequirementMessage, 'GL code required');
      return;
    }

    this.mappingTarget = record;
    this.mappingSubmitted = false;
    this.mappingSaving = false;
    this.mappingPrefillLoading = false;
    this.activeMappingId = null;
    this.mappingInitialValues = null;

    this.mappingForm.reset({
      glCodeId: '',
      status: 'ACTIVE',
    });

    this.mappingModalOpen = true;
    this.cdr.detectChanges();

    if (mappingConfigured) {
      this.loadExistingGlMapping(record.id);
    }
  }

  closeGlMappingModal(): void {
    this.mappingModalOpen = false;
    this.mappingSubmitted = false;
    this.mappingSaving = false;
    this.mappingPrefillLoading = false;
    this.mappingTarget = null;
    this.activeMappingId = null;
    this.mappingInitialValues = null;
    this.mappingForm.reset({
      glCodeId: '',
      status: 'ACTIVE',
    });
    this.cdr.detectChanges();
  }

  saveGlMapping(): void {
    this.mappingSubmitted = true;
    if (this.mappingForm.invalid || this.mappingSaving) {
      return;
    }

    const record = this.mappingTarget;
    if (!record?.id) {
      this.toastr.error('Select a bank account before saving the mapping.', 'Error');
      return;
    }

    const companyId = this.activeCompanyId;
    if (!companyId) {
      this.toastr.warning(this.companySelectionMessage, 'Company required');
      return;
    }

    const glCodeId = this.normalizeId(this.mappingForm.value.glCodeId);
    const status = this.normalizeStatus(this.mappingForm.value.status);

    if (glCodeId === null || !status) {
      return;
    }

    if (this.activeMappingId) {
      const payload: UpdateBankGlMappingPayload = {};
      const initial = this.mappingInitialValues;
      if (!initial || initial.glCodeId !== glCodeId) {
        payload.glCodeId = glCodeId;
      }
      if (!initial || initial.status !== status) {
        payload.status = status;
      }

      if (Object.keys(payload).length === 0) {
        this.toastr.info('No changes detected for GL mapping.', 'No changes');
        this.closeGlMappingModal();
        return;
      }

      this.mappingSaving = true;
      this.bankAccountService
        .updateBankGlMapping(companyId, this.activeMappingId, payload)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.mappingSaving = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: (response) => {
            this.toastr.success(response?.message ?? 'GL mapping updated.', 'Success');
            this.closeGlMappingModal();
            this.fetchBankAccounts();
          },
          error: (error) => {
            console.error('Failed to update GL mapping', error);
            this.toastr.error('Failed to update GL mapping. Please try again.', 'Error');
          },
        });
      return;
    }

    const payload = {
      bankAccountId: record.id,
      glCodeId,
      status,
    } as const;

    this.mappingSaving = true;
    this.bankAccountService
      .createBankGlMapping(companyId, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.mappingSaving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message ?? 'GL mapping saved.', 'Success');
          this.closeGlMappingModal();
          this.fetchBankAccounts();
        },
        error: (error) => {
          console.error('Failed to save GL mapping', error);
          this.toastr.error('Failed to save GL mapping. Please try again.', 'Error');
        },
      });
  }

  getMappingMeta(status: string | null | undefined): MappingMeta {
    if (!status) {
      return { label: 'Missing', variant: 'missing' };
    }
    return this.mappingStatusMeta[status.toUpperCase()] ?? {
      label: status,
      variant: 'missing',
    };
  }

  hasConfiguredMapping(status: string | null | undefined): boolean {
    if (!status) {
      return false;
    }
    const normalized = status.toUpperCase();
    return normalized === 'CONFIGURED' || normalized === 'COMPLETE';
  }

  private fetchBankAccounts(): void {
    const companyId = this.activeCompanyId;
    if (!companyId) {
      return;
    }
    this.loading = true;
    this.cdr.detectChanges();

    this.bankAccountService
      .getBankAccounts(companyId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const records = Array.isArray(response?.data) ? response.data : [];
          this.records = records.map((entity) => this.mapEntityToRecord(entity));
        },
        error: (error) => {
          console.error('Failed to load bank accounts', error);
          this.records = [];
          this.toastr.error('Failed to load bank accounts. Please try again.', 'Error');
        },
      });
  }

  private loadGlCodes(companyId: number): void {
    this.glCodesLoading = true;
    this.cdr.detectChanges();

    this.glCodeService
      .getGlCode(companyId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.glCodesLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const glCodes = Array.isArray(response?.data) ? response.data : [];
          this.glCodeOptions = glCodes.map((code) => this.toGlCodeOption(code));
        },
        error: (error) => {
          console.error('Failed to load GL codes', error);
          this.glCodeOptions = [];
        },
      });
  }

  private loadExistingGlMapping(bankAccountId: number): void {
    this.mappingPrefillLoading = true;
    this.cdr.detectChanges();

    this.bankAccountService
      .getBankAccountGlMapping(bankAccountId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.mappingPrefillLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const data = response?.data;
          if (!data) {
            return;
          }
          const glCodeId = this.normalizeId(data.glCodeId);
          const status = this.normalizeStatus(data.status) ?? 'ACTIVE';
          const label = this.buildGlCodeLabel(data);

          this.ensureGlOptionExists(glCodeId, label);

          this.activeMappingId = data.mappingId ?? null;
          this.mappingInitialValues = {
            glCodeId,
            status,
          };

          this.mappingForm.patchValue({
            glCodeId: glCodeId ?? '',
            status,
          });
        },
        error: (error) => {
          console.error('Failed to load GL mapping', error);
          this.toastr.error('Failed to load GL mapping. Please try again.', 'Error');
        },
      });
  }

  private buildCreatePayload(formValue: Record<string, unknown>): CreateBankAccountPayload {
    const sanitize = (value: unknown) =>
      typeof value === 'string' ? value.trim() : value === null ? null : '';

    const payload: CreateBankAccountPayload = {
      bankName: String(sanitize(formValue['bankName'])).trim(),
      accountNumber: String(sanitize(formValue['accountNumber'])).trim(),
    };

    const currency = sanitize(formValue['currency']);
    if (typeof currency === 'string' && currency) {
      payload.currency = currency.toUpperCase();
    }

    const address = sanitize(formValue['address']);
    if (typeof address === 'string' && address) {
      payload.address = address;
    }

    const branch = sanitize(formValue['branch']);
    if (typeof branch === 'string' && branch) {
      payload.branch = branch;
    }

    return payload;
  }

  private mapEntityToRecord(entity: CompanyBankAccountEntity): BankAccountRecord {
    return {
      id: entity.bankAccountId,
      bankName: entity.bankName,
      accountNumber: entity.accountNumber,
      currency: entity.currency ?? null,
      isDefault: entity.isDefault ?? null,
      mappingStatus: entity.mappingStatus ?? null,
    };
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

  private normalizeId(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeStatus(value: unknown): BankAccountStatus | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.toUpperCase();
    return normalized === 'ACTIVE' || normalized === 'INACTIVE'
      ? (normalized as BankAccountStatus)
      : null;
  }

  private toGlCodeOption(entity: GlCodeEntity): GlCodeOption {
    const parts = [entity.glCode, entity.description].filter(Boolean);
    return {
      id: entity.id,
      label: parts.join(' - '),
    };
  }

  private ensureGlOptionExists(id: number | null, label: string | null): void {
    if (!id || !label) {
      return;
    }
    const exists = this.glCodeOptions.some((option) => option.id === id);
    if (!exists) {
      this.glCodeOptions = [...this.glCodeOptions, { id, label }];
      this.cdr.detectChanges();
    }
  }

  private buildGlCodeLabel(mapping: BankGlMappingEntity | null | undefined): string | null {
    if (!mapping) {
      return null;
    }
    const parts = [mapping.glCode, mapping.glDescription].filter((part): part is string => !!part);
    if (parts.length) {
      return parts.join(' - ');
    }
    if (mapping.glCodeId) {
      return `GL Code ${mapping.glCodeId}`;
    }
    return null;
  }

  private resetMappingState(): void {
    this.mappingTarget = null;
    this.activeMappingId = null;
    this.mappingInitialValues = null;
    this.mappingModalOpen = false;
  }
}
