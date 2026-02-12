import { Component, OnInit, ChangeDetectorRef, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Customer } from '../../services/customer';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Spinner } from '../../shared/spinner/spinner';
import { ToastrService } from 'ngx-toastr';
import { CustomerEntity } from '../../models/customer.model';
import { Subject, takeUntil } from 'rxjs';
import { CompanySelectionService } from '../../services/company-selection.service';

type TabKey =
  | 'main'
  | 'address'
  | 'processing'
  | 'application'
  | 'statement'
  | 'eft'
  | 'vat'
  | 'dunning';

type CustomerDetail = CustomerEntity & {
  companyId: number;
  companyName: string;
  createdAt: string;
  updatedAt: string;
};
type GenericRecord = Record<string, unknown>;

@Component({
  selector: 'app-add-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule, Spinner],
  templateUrl: './add-customer.html',
  styleUrls: ['./add-customer.css'],
})
export class AddCustomer implements OnInit, OnDestroy {
  activeTab: TabKey = 'main';
  pageTitle = 'New Company';
  tabItems: Array<{ key: TabKey; label: string }> = [
    { key: 'main', label: 'Main' },
    { key: 'address', label: 'Address' },
    { key: 'eft', label: 'EFT' },
    { key: 'vat', label: 'VAT' },
    { key: 'dunning', label: 'Dunning / Credit' },
  ];

  // Mode
  isEditMode = false;
  customerId: number | null = null;
  createdCustomerId: number | null = null;
  originalData: CustomerDetail | null = null;
  // TAB LOCKING FOR ADD MODE
  allowedTabs: TabKey[] = ['main'];

  // Forms
  mainForm!: FormGroup;
  addressForm!: FormGroup;
  applicationForm!: FormGroup;
  statementForm!: FormGroup;
  eftForm!: FormGroup;
  vatForm!: FormGroup;
  dunningForm!: FormGroup;

  // Submit Flags
  submitted = false;
  addressSubmitted = false;
  applicationSubmitted = false;
  statementSubmitted = false;
  eftSubmitted = false;
  vatSubmitted = false;
  showVatForm = false;
  dunningSubmitted = false;

  // Loading Flags
  isSavingMain = false;
  isSavingAddress = false;
  isSavingApplication = false;
  isSavingStatement = false;
  isSavingEft = false;
  isSavingVat = false;
  isSavingDunning = false;
  isUpdatingCustomer = false;
  selectedCompanyId: string | null = null;

  private titleMap: Record<TabKey, string> = {
    main: 'Company – Basic Info',
    address: 'Address',
    processing: 'Processing',
    application: 'Application',
    statement: 'Statement',
    eft: 'EFT',
    vat: 'VAT',
    dunning: 'Dunning / Credit',
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private customerService: Customer,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private companySelection: CompanySelectionService,
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode = true;
      this.customerId = Number(idParam);
      this.pageTitle = 'Edit Company';
    }

    this.initializeForms();

    if (!this.isEditMode) {
      this.initializeCompanySelection();
    }

    if (this.isEditMode) {
      this.allowedTabs = ['main', 'address', 'eft', 'vat', 'dunning'];
      this.loadCustomerData();
    }
  }

  initializeForms() {
    // MAIN
    this.mainForm = this.fb.group({
      companyId: ['', Validators.required],
      customerName: [
        '',
        [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z ]+$/)],
      ],
      customerType: ['', [Validators.required, Validators.pattern(/^[A-Za-z ]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\(\d{3}\) \d{3}-\d{4}$/)]],

      faceBook: [''],
      twitter: [''],
      linkedin: [''],
    });

    // ADDRESS
    this.addressForm = this.fb.group({
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      city: ['', Validators.required],
      stateProvince: ['', Validators.required],
      postalCode: ['', [Validators.required, Validators.pattern(/^[0-9]{1,6}$/)]],
      country: ['', Validators.required],
    });

    // APPLICATION
    this.applicationForm = this.fb.group({
      applyPayments: [false],
      autoApplyPayments: [false],
      shipCreditCheck: [false],
      tolerancePercentage: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      toleranceAmount: ['', [Validators.required, Validators.min(0)]],
    });

    // STATEMENT
    this.statementForm = this.fb.group({
      sendStatements: [false],
      autoApplyPayments: [false],
      tolerancePercentage: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      minimumAmount: ['', [Validators.required, Validators.min(0)]],
    });

    // EFT
    this.eftForm = this.fb.group({
      bankName: ['', Validators.required],
      ibanAccountNumber: ['', Validators.required],
      bankIdentifierCode: ['', Validators.required],
      // enableAchPayments: [false],
      // allowDirectDebit: [false],
    });

    // VAT
    this.vatForm = this.fb.group({
      taxIdentificationNumber: [''],
      taxAgencyName: [''],
      enableVatCodes: [false],
      vatCode: [''],
    });

    // DUNNING
    this.dunningForm = this.fb.group({
      placeOnCreditHold: [false],
      creditLimit: ['', [Validators.required, Validators.min(1)]],
      dunningLevel: ['', Validators.required],
      pastDue: ['', Validators.required],
      paymentTerms: ['', Validators.required],
      level1: ['', Validators.required],
      level2: ['', Validators.required],
      level3: ['', Validators.required],
      level4: ['', Validators.required],
    });

  }

  onPhoneInput() {
    let value = this.mainForm.get('phoneNumber')?.value || '';
    value = value.replace(/\D/g, '').slice(0, 10);

    let formatted = value;

    if (value.length > 6) {
      formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
    } else if (value.length > 3) {
      formatted = `(${value.slice(0, 3)}) ${value.slice(3)}`;
    }

    this.mainForm.get('phoneNumber')?.setValue(formatted, { emitEvent: false });
  }

  limitPostalCode(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const cleaned = input.value.replace(/\D/g, '');
    const sliced = cleaned.slice(0, 6);
    input.value = sliced;
    this.addressForm.get('postalCode')?.setValue(sliced);
  }

  loadCustomerData() {
    if (!this.customerId) return;

    this.customerService.getCustomerById(this.customerId).subscribe((res) => {
      const data = res.data as CustomerDetail;

      this.originalData = JSON.parse(JSON.stringify(data)) as CustomerDetail;

      this.mainForm.patchValue(data);

      if (data.address) this.addressForm.patchValue(data.address);
      if (data.cashApplication) this.applicationForm.patchValue(data.cashApplication);
      if (data.statement) this.statementForm.patchValue(data.statement);
      if (data.eft) this.eftForm.patchValue(data.eft);

      // Check if VAT data exists and set toggle accordingly
      if (data.vat) {
        this.vatForm.patchValue(data.vat);

        // Enable toggle if any VAT field has data
        const hasVatData =
          data.vat.taxIdentificationNumber || data.vat.taxAgencyName || data.vat.enableVatCodes;

        if (hasVatData) {
          this.showVatForm = true;
        }
      }

      // Handle dunning/credit data with payment terms
      if (data.dunning) {
        const dunningData = { ...data.dunning };
        const supportedTerms = ['Net 30', 'Net60', 'Net90'];
        const formattedLimit = this.formatCreditLimitValue(dunningData.creditLimit);
        const dunningFormValue: GenericRecord = {
          ...dunningData,
          creditLimit: formattedLimit,
        };

        if (dunningData.paymentTerms && !supportedTerms.includes(dunningData.paymentTerms)) {
          dunningFormValue['paymentTerms'] = '';
        }

        this.dunningForm.patchValue(dunningFormValue);
      }
    });
  }

  // ----------------------------------------------
  // Detect updated fields only
  // ----------------------------------------------
  private getUpdatedFields<T extends GenericRecord>(
    formValue: T,
    originalValue: Partial<T> | null | undefined,
  ) {
    const updated: Partial<T> = {};

    Object.keys(formValue).forEach((key) => {
      const typedKey = key as keyof T;
      const newVal = formValue[typedKey];
      const oldVal = originalValue?.[typedKey];

      if (
        (newVal === '' || newVal === null || newVal === undefined) &&
        (oldVal === '' || oldVal === null || oldVal === undefined)
      )
        return;

      if (newVal === oldVal) return;

      (updated as GenericRecord)[key] = newVal as unknown;
    });

    return updated;
  }

  // ----------------------------------------------
  // TAB SWITCHING
  // ----------------------------------------------
  isActive(tab: TabKey) {
    return this.activeTab === tab;
  }

  canAccessTab(tab: TabKey) {
    return this.isEditMode || this.allowedTabs.includes(tab);
  }

  goToTab(tab: TabKey) {
    if (!this.isEditMode && !this.allowedTabs.includes(tab)) return;

    this.zone.run(() => {
      this.activeTab = tab;
      this.pageTitle = this.titleMap[tab];
      this.cdr.detectChanges();
    });
  }

  onTabSelect(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    if (!select) return;
    this.goToTab(select.value as TabKey);
  }

  // ----------------------------------------------
  // SAVE MAIN → ADDRESS
  // ----------------------------------------------
  saveMainData() {
    if (this.isEditMode) return;

    this.submitted = true;
    if (this.mainForm.invalid || this.isSavingMain) {
      if (!this.mainForm.value.companyId) {
        this.toastr.error(
          'Please select an AR Company from the navbar before adding a customer.',
          'AR Company Required',
        );
      }
      return;
    }

    this.isSavingMain = true;

    const companyId = Number(this.mainForm.value.companyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      this.isSavingMain = false;
      this.toastr.error(
        'Please select an AR Company from the navbar before adding a customer.',
        'AR Company Required',
      );
      return;
    }

    this.customerService.createCustomer(companyId, this.mainForm.value).subscribe({
      next: (res) => {
        const id = res?.data?.id;
        if (id) this.createdCustomerId = Number(id);

        this.isSavingMain = false;

        this.allowedTabs = ['main', 'address'];
        this.goToTab('address');
      },
      error: (err) => {
        const message = err?.error?.message || 'Failed to create customer.';
        this.toastr.error(message, 'Error');
        this.isSavingMain = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ADDRESS → EFT
  saveAddressData() {
    if (this.isEditMode) return;

    this.addressSubmitted = true;
    if (this.addressForm.invalid || !this.createdCustomerId || this.isSavingAddress) return;

    this.isSavingAddress = true;

    this.customerService.saveAddress(this.createdCustomerId, this.addressForm.value).subscribe({
      next: () => {
        this.isSavingAddress = false;
        this.allowedTabs.push('eft');
        this.goToTab('eft');
      },
      error: () => (this.isSavingAddress = false),
    });
  }

  // APPLICATION (kept)
  saveApplicationData() {
    if (this.isEditMode) return;

    this.applicationSubmitted = true;
    if (this.applicationForm.invalid || !this.createdCustomerId || this.isSavingApplication) return;

    this.isSavingApplication = true;

    this.customerService
      .saveApplication(this.createdCustomerId, this.applicationForm.value)
      .subscribe({
        next: () => {
          this.isSavingApplication = false;
          this.allowedTabs.push('statement');
          this.goToTab('statement');
        },
        error: () => (this.isSavingApplication = false),
      });
  }

  // STATEMENT (kept)
  saveStatementData() {
    if (this.isEditMode) return;

    this.statementSubmitted = true;
    if (this.statementForm.invalid || !this.createdCustomerId || this.isSavingStatement) return;

    this.isSavingStatement = true;

    this.customerService.saveStatement(this.createdCustomerId, this.statementForm.value).subscribe({
      next: () => {
        this.isSavingStatement = false;
        this.allowedTabs.push('eft');
        this.goToTab('eft');
      },
      error: () => (this.isSavingStatement = false),
    });
  }

  // EFT → VAT
  saveEftData() {
    if (this.isEditMode) return;

    this.eftSubmitted = true;
    if (this.eftForm.invalid || !this.createdCustomerId || this.isSavingEft) return;

    this.isSavingEft = true;

    this.customerService.saveEft(this.createdCustomerId, this.eftForm.value).subscribe({
      next: () => {
        this.isSavingEft = false;
        this.allowedTabs.push('vat');
        this.goToTab('vat');
      },
      error: () => (this.isSavingEft = false),
    });
  }

  // VAT → DUNNING (Modified to allow skipping with toggle check)
  saveVatData() {
    if (this.isEditMode) return;

    this.vatSubmitted = true;

    // If VAT form is not shown (toggle is OFF), skip to next tab
    if (!this.showVatForm) {
      this.allowedTabs.push('dunning');
      this.goToTab('dunning');
      return;
    }

    // Check if form has any data when toggle is ON
    const hasVatData =
      this.vatForm.value.taxIdentificationNumber ||
      this.vatForm.value.taxAgencyName ||
      this.vatForm.value.enableVatCodes ||
      this.vatForm.value.vatCode;

    // If no data is filled, skip the API call and move to next tab
    if (!hasVatData) {
      this.allowedTabs.push('dunning');
      this.goToTab('dunning');
      return;
    }

    // If data is filled but invalid, show errors
    if (this.vatForm.invalid || !this.createdCustomerId || this.isSavingVat) return;

    this.isSavingVat = true;

    this.customerService.saveVat(this.createdCustomerId, this.vatForm.value).subscribe({
      next: () => {
        this.isSavingVat = false;
        this.allowedTabs.push('dunning');
        this.goToTab('dunning');
      },
      error: () => (this.isSavingVat = false),
    });
  }

  onCreditLimitInput() {
    const control = this.dunningForm.get('creditLimit');
    if (!control) return;

    let value = control.value || '';

    const formatted = this.formatCreditLimitValue(value);
    control.setValue(formatted, { emitEvent: false });
  }

  // DUNNING → finish
  saveDunningData() {
    if (this.isEditMode) return;

    this.dunningSubmitted = true;
    if (this.dunningForm.invalid || !this.createdCustomerId || this.isSavingDunning) return;

    this.isSavingDunning = true;

    const formValue = this.dunningForm.value;
    const numericCreditLimit = this.normalizeCreditLimit(formValue.creditLimit);

    if (numericCreditLimit === null) {
      this.isSavingDunning = false;
      return;
    }

    const payload = {
      ...formValue,
      creditLimit: numericCreditLimit,
      paymentTerms: formValue.paymentTerms,
    };

    this.customerService.saveCredit(this.createdCustomerId, payload).subscribe({
      next: () => {
        this.isSavingDunning = false;
        this.toastr.success('Customer added successfully.', 'Success');
        this.router.navigate(['/admin/customer']);
      },
      error: () => (this.isSavingDunning = false),
    });
  }

  updateCustomer() {
    if (!this.isEditMode || !this.customerId || this.isUpdatingCustomer) return;

    this.isUpdatingCustomer = true;

    const payload: Record<string, unknown> = {};

    if (this.mainForm.dirty) {
      const base = (this.originalData ?? ({} as CustomerDetail)) as unknown as GenericRecord;
      Object.assign(payload, this.getUpdatedFields(this.mainForm.value as GenericRecord, base));
    }

    const addr = this.addressForm.dirty
      ? this.getUpdatedFields(
          this.addressForm.value as GenericRecord,
          (this.originalData?.address ?? {}) as GenericRecord,
        )
      : {};
    if (Object.keys(addr).length) payload['addresses'] = addr;

    const app = this.applicationForm.dirty
      ? this.getUpdatedFields(
          this.applicationForm.value as GenericRecord,
          (this.originalData?.cashApplication ?? {}) as GenericRecord,
        )
      : {};
    if (Object.keys(app).length) payload['cashApplication'] = app;

    const st = this.statementForm.dirty
      ? this.getUpdatedFields(
          this.statementForm.value as GenericRecord,
          (this.originalData?.statement ?? {}) as GenericRecord,
        )
      : {};
    if (Object.keys(st).length) payload['statement'] = st;

    const ef = this.eftForm.dirty
      ? this.getUpdatedFields(
          this.eftForm.value as GenericRecord,
          (this.originalData?.eft ?? {}) as GenericRecord,
        )
      : {};
    if (Object.keys(ef).length) payload['eft'] = ef;

    const vt = this.vatForm.dirty
      ? this.getUpdatedFields(
          this.vatForm.value as GenericRecord,
          (this.originalData?.vat ?? {}) as GenericRecord,
        )
      : {};
    if (Object.keys(vt).length) payload['vat'] = vt;

    // Updated dunning handling
    if (this.dunningForm.dirty) {
      const formValue = this.dunningForm.value as GenericRecord;
      const normalizedFormValue: GenericRecord = {
        ...formValue,
        creditLimit: this.normalizeCreditLimit(formValue['creditLimit'] as string | number | null),
      };
      const dunningPayload = this.getUpdatedFields(
        normalizedFormValue,
        (this.originalData?.dunning ?? {}) as GenericRecord,
      );

      if (dunningPayload['creditLimit'] === null) {
        delete dunningPayload['creditLimit'];
      }

      if (Object.keys(dunningPayload).length) {
        payload['dunningCredit'] = dunningPayload;
      }
    }

    if (!Object.keys(payload).length) {
      // No changes detected - just navigate back without showing toaster
      this.isUpdatingCustomer = false;
      this.router.navigate(['/admin/customer']);
      return;
    }

    this.customerService.updateCustomer(this.customerId, payload).subscribe({
      next: () => {
        this.isUpdatingCustomer = false;
        this.toastr.success('Customer details updated successfully.', 'Success');
        this.router.navigate(['/admin/customer']);
      },
      error: (err) => {
        this.isUpdatingCustomer = false;
        const message = err?.error?.message || 'Failed to update customer.';
        this.toastr.error(message, 'Error');
      },
    });
  }

  hasAnyChanges(): boolean {
    return (
      this.mainForm.dirty ||
      this.addressForm.dirty ||
      this.applicationForm.dirty ||
      this.statementForm.dirty ||
      this.eftForm.dirty ||
      this.vatForm.dirty ||
      this.dunningForm.dirty
    );
  }

  private initializeCompanySelection() {
    this.selectedCompanyId = this.companySelection.getSelectedCompanyId();
    this.updateCompanyOptions(this.selectedCompanyId);

    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      this.selectedCompanyId = id;
      this.updateCompanyOptions(id);
    });
  }

  private updateCompanyOptions(id: string | null) {
    const control = this.mainForm?.get('companyId');
    if (!control) {
      return;
    }

    if (!id) {
      control.setValue('', { emitEvent: false });
      control.markAsPristine();
      return;
    }

    const currentValue = control.value;
    if (currentValue !== id) {
      control.setValue(id, { emitEvent: false });
      control.markAsPristine();
    }
  }

  private formatCreditLimitValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const numeric =
      typeof value === 'number' ? value : Number(String(value).replace(/[^\d]/g, ''));

    if (!Number.isFinite(numeric) || numeric < 0) {
      return '';
    }

    return `$${numeric.toLocaleString('en-US')}`;
  }

  private normalizeCreditLimit(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numeric =
      typeof value === 'number' ? value : Number(String(value).replace(/[^\d]/g, ''));

    if (!Number.isFinite(numeric)) {
      return null;
    }

    return numeric;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
