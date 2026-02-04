import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidatorFn,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../../services/company-service';
import { Subject, takeUntil } from 'rxjs';
import { Spinner } from '../../../shared/spinner/spinner';
import { CompanyAddress, CompanyEntity, FinancialSettings } from '../../../models/company.model';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-financial-ar-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  templateUrl: './financial-ar-settings.html',
  styleUrls: ['./financial-ar-settings.css'],
})
export class FinancialArSettings implements OnInit, OnDestroy {
  financialForm!: FormGroup;
  submitted = false;
  isEditMode = false;
  companyId!: number;
  companyData: CompanyEntity | null = null;
  isSaving = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
  ) {}

  ngOnInit() {
    const id = this.route.parent?.snapshot.params['id'] ?? this.route.snapshot.params['id'];

    if (id) {
      this.isEditMode = true;
      this.companyId = Number(id);

      const parsed = this.parseCompany(localStorage.getItem('editingCompany'));
      if (parsed?.id === this.companyId) {
        this.companyData = parsed;
      }
    } else {
      this.companyId = Number(localStorage.getItem('companyId'));
    }

    this.buildForm();

    if (this.isEditMode) {
      const existingFinancial = this.companyData?.financialSettings || this.companyData?.financial;

      if (existingFinancial) {
        this.financialForm.patchValue(existingFinancial);
        this.syncCreditLimitField();
      }

      this.companyService.editingCompany$.pipe(takeUntil(this.destroy$)).subscribe((data) => {
        if (data?.id === this.companyId) {
          this.companyData = data;

          const src = data.financialSettings || data.financial;
          if (src) {
            this.financialForm.patchValue(src);
            this.syncCreditLimitField();
          }
        }
      });
    }
  }

  buildForm() {
    this.financialForm = this.fb.group({
      fiscalYearStartMonth: ['', Validators.required],
      // defaultArAccountCode: ['', Validators.required],
      revenueRecognitionMode: ['', Validators.required],
      defaultTaxHandling: ['', Validators.required],
      defaultPaymentTerms: ['', Validators.required],
      allowOtherTerms: [false],
      enableCreditLimitChecking: [false],
      agingBucketConfig: [''], // Made optional - field is hidden
      dunningFrequencyDays: ['', [Validators.min(1)]], // Made optional - field is hidden
      enableAutomatedDunningEmails: [false],
      defaultCreditLimit: ['', [Validators.required, this.positiveNumberValidator()]],
    });
  }

  saveFinancialSettings() {
    this.submitted = true;
    if (this.financialForm.invalid) return;

    if (this.isEditMode) {
      this.saveEditMode();
    } else {
      this.saveAddMode();
    }
  }

  saveAddMode() {
    this.isSaving = true;

    const payload = this.buildFinancialPayload();

    this.companyService
      .createFinancialSettings(this.companyId, payload)
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
      )
      .subscribe({
        next: () => {
          localStorage.setItem('currentStep', 'step-3');
          this.router.navigate(['/admin/ar-company/onboarding-complete'], {
            queryParams: { id: this.companyId },
          });
        },
        error: () => {
          // Error already handled in finalize
        },
      });
  }

  private saveEditMode() {
    this.persistFinancialEdit(true);
    this.finalUpdateEditMode();
  }

  private persistFinancialEdit(force = false) {
    if (!this.isEditMode || !this.financialForm) return;
    if (!force && !this.financialForm.dirty) return;

    if (!this.companyData) {
      return;
    }

    const updated: CompanyEntity = {
      ...this.companyData,
      financial: {
        ...this.buildFinancialPayload(),
      },
    } as CompanyEntity;

    localStorage.setItem('editingCompany', JSON.stringify(updated));
    this.companyService.setEditingCompany(updated);
    this.companyData = updated;
  }

  private finalUpdateEditMode() {
    if (!this.validateEditFlow()) {
      return;
    }

    this.isSaving = true;

    const payload = this.companyService.getChangedCompanyPayload();

    if (!payload || Object.keys(payload).length === 0) {
      this.isSaving = false;
      this.router.navigate(['/admin/ar-company']);
      return;
    }

    this.companyService
      .updateCompany(this.companyId, payload)
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
      )
      .subscribe({
        next: () => {
          localStorage.removeItem('editingCompany');
          this.companyService.setEditingCompany(null);
          this.companyService.setOriginalCompany(null);
          this.router.navigate(['/admin/ar-company']);
        },
        error: (err) => {
          console.error('AR Company update failed:', err);
          this.toastr.error('Failed to update AR company. Please try again.', 'Error');
        },
      });
  }

  private validateEditFlow(): boolean {
    if (!this.isEditMode) {
      return true;
    }

    const company = this.companyService.getEditingCompanySnapshot() || this.companyData;
    if (!company) {
      this.toastr.error('AR Company data is missing. Please reload and try again.', 'Error');
      return false;
    }

    const basicFields: Array<keyof CompanyEntity> = [
      'legalName',
      'tradeName',
      'companyCode',
      'country',
      'baseCurrency',
      'timeZone',
    ];
    if (!this.hasValues(company, basicFields)) {
      this.toastr.error('Please fill all required fields in the Basic Info tab.', 'Missing fields');
      return false;
    }

    const addressSource: Partial<CompanyAddress> | null = company.companyAddress ?? company;
    const addressFields: Array<keyof CompanyAddress> = [
      'addressLine1',
      'city',
      'stateProvince',
      'postalCode',
      'addressCountry',
      'primaryContactName',
      'position',
      'primaryContactEmail',
      'primaryContactPhone',
      'primaryContactCountry',
    ];
    if (!this.hasValues(addressSource, addressFields)) {
      this.toastr.error('Please fill all required fields in the Address Info tab.', 'Missing fields');
      return false;
    }

    const financialSource: Partial<FinancialSettings> =
      company.financial ?? company.financialSettings;
    const financialFields: Array<keyof FinancialSettings> = [
      'fiscalYearStartMonth',
      'revenueRecognitionMode',
      'defaultTaxHandling',
      'defaultPaymentTerms',
      'defaultCreditLimit',
    ];
    if (!this.hasValues(financialSource, financialFields)) {
      this.toastr.error(
        'Please fill all required fields in the Financial & AR Settings tab.',
        'Missing fields',
      );
      return false;
    }

    if (!this.hasMinValue(financialSource?.defaultCreditLimit, 1)) {
      this.toastr.error('Financial & AR Settings requires a valid credit limit (> 0).', 'Invalid value');
      return false;
    }

    return true;
  }

  private hasValues<T extends object>(source: Partial<T> | null | undefined, fields: (keyof T)[]) {
    if (!source) {
      return false;
    }
    return fields.every((field) => this.isFilled(source[field]));
  }

  private isFilled(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return true;
  }

  private hasMinValue(value: unknown, min: number): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    const numericValue = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(numericValue)) {
      return false;
    }
    return numericValue >= min;
  }

  ngOnDestroy() {
    this.persistFinancialEdit();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private parseCompany(value: string | null): CompanyEntity | null {
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as CompanyEntity;
    } catch {
      return null;
    }
  }

  onCreditLimitInput() {
    const control = this.financialForm.get('defaultCreditLimit');
    if (!control) {
      return;
    }
    const raw = control.value ?? '';
    const sanitized = String(raw).replace(/\D/g, '');
    control.setValue(sanitized, { emitEvent: false });
  }

  private syncCreditLimitField() {
    const control = this.financialForm.get('defaultCreditLimit');
    if (!control) {
      return;
    }
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return;
    }
    if (typeof value === 'number') {
      control.setValue(String(value), { emitEvent: false });
    }
  }

  private buildFinancialPayload() {
    const raw = this.financialForm.getRawValue();
    return {
      ...raw,
      defaultCreditLimit: this.parseCreditLimit(raw.defaultCreditLimit),
    };
  }

  private parseCreditLimit(value: unknown): number {
    const numericValue = Number(String(value ?? '').replace(/\D/g, ''));
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  private positiveNumberValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value;
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const numericValue = Number(String(value).replace(/\D/g, ''));
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return { positiveNumber: true };
      }
      return null;
    };
  }
}
