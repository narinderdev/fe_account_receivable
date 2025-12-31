import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../../services/company-service';
import { Subject, takeUntil } from 'rxjs';
import { Spinner } from '../../../shared/spinner/spinner';
import { CompanyEntity } from '../../../models/company.model';
import { ToastrService } from 'ngx-toastr';

function atLeastOnePaymentValidator(group: FormGroup) {
  const methods = [
    group.get('acceptCheck')?.value,
    group.get('acceptCreditCard')?.value,
    group.get('acceptBankTransfer')?.value,
    group.get('acceptCash')?.value,
  ];
  return methods.includes(true) ? null : { noPaymentSelected: true };
}

@Component({
  selector: 'app-banks-and-payments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  templateUrl: './banks-and-payments.html',
  styleUrls: ['./banks-and-payments.css'],
})
export class BanksAndPayments implements OnInit, OnDestroy {
  paymentForm!: FormGroup;
  submitted = false;
  isSaving = false;
  isEditMode = false;
  companyId!: number;
  companyData: CompanyEntity | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    // Detect Edit Mode
    const id = this.route.parent?.snapshot.params['id'] ?? this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.companyId = Number(id);

      const parsed = this.parseCompany(localStorage.getItem('editingCompany'));
      if (parsed?.id === this.companyId) {
        this.companyData = parsed;
      }
    } else {
      // ADD MODE companyId comes from step-1
      this.companyId = Number(localStorage.getItem('companyId'));
    }

    this.buildForm();

    // Prefill in Edit Mode
    if (this.isEditMode) {
      this.prefillEditData();

      // Live sync for editing mode
      this.companyService.editingCompany$.pipe(takeUntil(this.destroy$)).subscribe((data) => {
        if (data?.id === this.companyId) {
          this.companyData = data;
          this.prefillEditData();
        }
      });
    }
  }

  buildForm() {
    this.paymentForm = this.fb.group(
      {
        // BANK ACCOUNT FIELDS
        bankName: ['', Validators.required],
        accountNumber: ['', Validators.required],

        // PAYMENT METHODS
        acceptCheck: [false],
        acceptCreditCard: [false],
        acceptBankTransfer: [false],
        acceptCash: [false],

        remittanceInstructions: ['', Validators.required],
      },
      { validators: atLeastOnePaymentValidator }
    );
  }

  prefillEditData() {
    if (!this.companyData) {
      return;
    }

    // Patch payment settings (support both payment and paymentSettings)
    const paymentSource = this.companyData.payment || this.companyData.paymentSettings;
    if (paymentSource) {
      this.paymentForm.patchValue({
        acceptCheck: paymentSource.acceptCheck,
        acceptCreditCard: paymentSource.acceptCreditCard,
        acceptBankTransfer: paymentSource.acceptBankTransfer,
        acceptCash: paymentSource.acceptCash,
        remittanceInstructions: paymentSource.remittanceInstructions,
      });
    }

    // Patch bank account info from bankAccounts array (first bank account)
    if (this.companyData.bankAccounts && this.companyData.bankAccounts.length > 0) {
      const firstBank = this.companyData.bankAccounts[0];
      this.paymentForm.patchValue({
        bankName: firstBank.bankName,
        accountNumber: firstBank.accountNumber,
      });
    }
  }

  saveBankPayment() {
    this.submitted = true;
    if (this.paymentForm.invalid) return;

    if (this.isEditMode) {
      this.finalUpdateEditMode(); // FINAL STEP FOR EDIT MODE
    } else {
      this.saveAddMode(); // FINAL STEP FOR ADD MODE
    }
  }

  // -----------------------------
  // ADD MODE → final onboarding step
  // -----------------------------
  saveAddMode() {
    this.isSaving = true;

    const form = this.paymentForm.value;

    const payload = {
      paymentSettings: {
        acceptCheck: form.acceptCheck,
        acceptCreditCard: form.acceptCreditCard,
        acceptBankTransfer: form.acceptBankTransfer,
        acceptCash: form.acceptCash,
        remittanceInstructions: form.remittanceInstructions,
      },
      bankAccounts: [
        {
          bankName: form.bankName,
          accountNumber: form.accountNumber,
        },
      ],
    };

    this.companyService.createBanking(this.companyId, payload).subscribe({
      next: () => {
        this.isSaving = false;

        this.router.navigate(['/admin/company/onboarding-complete'], {
          queryParams: { id: this.companyId },
        });
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Banking save failed:', err);
      },
    });
  }

  // -----------------------------
  // EDIT MODE → final update logic moved from user-and-roles
  // -----------------------------
  finalUpdateEditMode() {
    if (!this.validateEditFlow()) {
      return;
    }

    this.isSaving = true;

    const updated = this.buildCompanyWithPayment(this.companyData);
    this.persistCompanySnapshot(updated);

    // Now compute diff from original
    const payload = this.companyService.getChangedCompanyPayload();

    if (!payload || Object.keys(payload).length === 0) {
      this.isSaving = false;
      this.router.navigate(['/admin/company']);
      return;
    }

    this.companyService.updateCompany(this.companyId, payload).subscribe({
      next: () => {
        this.isSaving = false;

        // Clear everything for clean next edit
        localStorage.removeItem('editingCompany');
        this.companyService.setEditingCompany(null);
        this.companyService.setOriginalCompany(null);

        this.router.navigate(['/admin/company']);
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Company update failed:', err);
      },
    });
  }

  private validateEditFlow(): boolean {
    if (!this.isEditMode) {
      return true;
    }

    const company = this.companyService.getEditingCompanySnapshot() || this.companyData;
    if (!company) {
      this.toastr.error('Company data is missing. Please reload and try again.');
      return false;
    }

    const basicFields = [
      'legalName',
      'tradeName',
      'companyCode',
      'country',
      'baseCurrency',
      'timeZone',
    ];
    if (!this.hasValues(company, basicFields)) {
      this.toastr.error('Please fill all required fields in the Basic Info tab.');
      return false;
    }

    const addressSource = company.companyAddress ?? company;
    const addressFields = [
      'addressLine1',
      'city',
      'stateProvince',
      'postalCode',
      'addressCountry',
      'primaryContactName',
      'primaryContactEmail',
      'primaryContactPhone',
      'primaryContactCountry',
    ];
    if (!this.hasValues(addressSource, addressFields)) {
      this.toastr.error('Please fill all required fields in the Address Info tab.');
      return false;
    }

    const financialSource = company.financial ?? company.financialSettings;
    const financialFields = [
      'fiscalYearStartMonth',
      'revenueRecognitionMode',
      'defaultTaxHandling',
      'defaultPaymentTerms',
      'agingBucketConfig',
      'dunningFrequencyDays',
      'defaultCreditLimit',
    ];
    if (!this.hasValues(financialSource, financialFields)) {
      this.toastr.error('Please fill all required fields in the Financial & AR Settings tab.');
      return false;
    }

    if (!this.hasMinValue(financialSource.dunningFrequencyDays, 1)) {
      this.toastr.error('Financial & AR Settings requires a valid dunning frequency (>= 1).');
      return false;
    }

    if (!this.hasMinValue(financialSource.defaultCreditLimit, 0)) {
      this.toastr.error('Financial & AR Settings requires a valid credit limit (>= 0).');
      return false;
    }

    return true;
  }

  private hasValues(source: any, fields: string[]): boolean {
    if (!source) {
      return false;
    }
    return fields.every((field) => this.isFilled(source[field]));
  }

  private isFilled(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    return typeof value === 'string' ? value.trim().length > 0 : true;
  }

  private hasMinValue(value: any, min: number): boolean {
    if (value === null || value === undefined || isNaN(value)) {
      return false;
    }
    return Number(value) >= min;
  }

  private buildCompanyWithPayment(baseData: CompanyEntity | null): CompanyEntity {
    const source = baseData ?? ({} as CompanyEntity);
    const form = this.paymentForm.getRawValue();

    return {
      ...source,
      payment: {
        ...(source.payment || {}),
        acceptCheck: form.acceptCheck,
        acceptCreditCard: form.acceptCreditCard,
        acceptBankTransfer: form.acceptBankTransfer,
        acceptCash: form.acceptCash,
        remittanceInstructions: form.remittanceInstructions,
      },
      bankAccounts: [
        {
          ...(source.bankAccounts?.[0] || {}),
          bankName: form.bankName,
          accountNumber: form.accountNumber,
        },
      ],
    } as CompanyEntity;
  }

  private persistCompanySnapshot(updated: CompanyEntity) {
    localStorage.setItem('editingCompany', JSON.stringify(updated));
    this.companyService.setEditingCompany(updated);
    this.companyData = updated;
  }

  private persistEditBankData(force = false) {
    if (!this.isEditMode || !this.paymentForm) {
      return;
    }
    if (!force && !this.paymentForm.dirty) {
      return;
    }

    const updated = this.buildCompanyWithPayment(this.companyData);
    this.persistCompanySnapshot(updated);
  }

  ngOnDestroy() {
    this.persistEditBankData();
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
}
