import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Customer } from '../../services/customer';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Spinner } from '../../shared/spinner/spinner';
import { ToastService } from '../../shared/toast/toast-service';

type TabKey =
  | 'main'
  | 'address'
  | 'processing'
  | 'application'
  | 'statement'
  | 'eft'
  | 'vat'
  | 'dunning';

@Component({
  selector: 'app-add-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Spinner],
  templateUrl: './add-customer.html',
  styleUrls: ['./add-customer.css'],
})
export class AddCustomer implements OnInit {
  activeTab: TabKey = 'main';
  pageTitle = 'New Customer';

  // Mode
  isEditMode = false;
  customerId: number | null = null;
  createdCustomerId: number | null = null;
  originalData: any = {};

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

  private titleMap: Record<TabKey, string> = {
    main: 'Customer – Basic Info',
    address: 'Address',
    processing: 'Processing',
    application: 'Application',
    statement: 'Statement',
    eft: 'EFT',
    vat: 'VAT',
    dunning: 'Dunning / Credit',
  };

  constructor(
    private fb: FormBuilder,
    private customerService: Customer,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode = true;
      this.customerId = Number(idParam);
      this.pageTitle = 'Edit Customer';
    }

    this.initializeForms();

    if (this.isEditMode) {
      this.allowedTabs = ['main', 'address', 'eft', 'vat', 'dunning'];
      this.loadCustomerData();
    }
  }

  initializeForms() {
    // MAIN
    this.mainForm = this.fb.group({
      customerName: [
        '',
        [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z ]+$/)],
      ],
      customerType: ['', [Validators.required, Validators.pattern(/^[A-Za-z ]+$/)]],
      email: ['', [Validators.required, Validators.email]],
    });

    // ADDRESS (FIXED POSTAL CODE REGEX)
    this.addressForm = this.fb.group({
      addressLine1: ['', Validators.required],
      city: ['', Validators.required],
      stateProvince: ['', Validators.required],
      postalCode: ['', [Validators.required, Validators.pattern(/^[0-9]{1,6}$/)]], // FIXED
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

    // EFT (FIXED: Added allowDirectDebit)
    this.eftForm = this.fb.group({
      bankName: ['', Validators.required],
      ibanAccountNumber: ['', Validators.required],
      bankIdentifierCode: ['', Validators.required],
      enableAchPayments: [false],
      allowDirectDebit: [false], // ← FIXED
    });

    // VAT
    this.vatForm = this.fb.group({
      taxIdentificationNumber: ['', Validators.required],
      taxAgencyName: ['', Validators.required],
      enableVatCodes: [false],
      vatCode: [''],
    });

    // DUNNING
    this.dunningForm = this.fb.group({
      placeOnCreditHold: [false],
      creditLimit: ['', [Validators.required, Validators.min(0)]],
      dunningLevel: ['', Validators.required],
      pastDue: ['', Validators.required],
      level1: ['', Validators.required],
      level2: ['', Validators.required],
      level3: ['', Validators.required],
      level4: ['', Validators.required],
    });
  }

  limitPostalCode(event: any) {
    const cleaned = event.target.value.replace(/\D/g, '');
    const sliced = cleaned.slice(0, 6);
    event.target.value = sliced;
    this.addressForm.get('postalCode')?.setValue(sliced);
  }

  // ----------------------------------------------
  // LOAD DATA FOR EDIT MODE
  // ----------------------------------------------
  loadCustomerData() {
    if (!this.customerId) return;

    this.customerService.getCustomerById(this.customerId).subscribe((res) => {
      const data = res.data;

      this.originalData = JSON.parse(JSON.stringify(data));

      this.mainForm.patchValue(data);

      if (data.address) this.addressForm.patchValue(data.address);
      if (data.cashApplication) this.applicationForm.patchValue(data.cashApplication);
      if (data.statement) this.statementForm.patchValue(data.statement);
      if (data.eft) this.eftForm.patchValue(data.eft);
      if (data.vat) this.vatForm.patchValue(data.vat);
      if (data.dunning) this.dunningForm.patchValue(data.dunning);
    });
  }

  // ----------------------------------------------
  // Detect updated fields only
  // ----------------------------------------------
  private getUpdatedFields(formValue: any, originalValue: any) {
    const updated: any = {};

    Object.keys(formValue).forEach((key) => {
      const newVal = formValue[key];
      const oldVal = originalValue?.[key];

      if (
        (newVal === '' || newVal === null || newVal === undefined) &&
        (oldVal === '' || oldVal === null || oldVal === undefined)
      )
        return;

      if (newVal === oldVal) return;

      updated[key] = newVal;
    });

    return updated;
  }

  // ----------------------------------------------
  // TAB SWITCHING
  // ----------------------------------------------
  isActive(tab: TabKey) {
    return this.activeTab === tab;
  }

  goToTab(tab: TabKey) {
    if (!this.isEditMode && !this.allowedTabs.includes(tab)) return;

    this.zone.run(() => {
      this.activeTab = tab;
      this.pageTitle = this.titleMap[tab];
      this.cdr.detectChanges();
    });
  }

  // ----------------------------------------------
  // SAVE MAIN → ADDRESS
  // ----------------------------------------------
  saveMainData() {
    if (this.isEditMode) return;

    this.submitted = true;
    if (this.mainForm.invalid || this.isSavingMain) return;

    this.isSavingMain = true;

    this.customerService.createCustomer(this.mainForm.value).subscribe({
      next: (res) => {
        const id = res?.data?.id;
        if (id) this.createdCustomerId = Number(id);

        this.isSavingMain = false;
        this.toastService.show('Customer added successfully.');

        this.allowedTabs = ['main', 'address'];
        this.goToTab('address');
      },
      error: () => {
        this.isSavingMain = false;
        this.toastService.show('Failed to add customer.', 'error');
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

  // VAT → DUNNING
  saveVatData() {
    if (this.isEditMode) return;

    this.vatSubmitted = true;
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

  // DUNNING → finish
  saveDunningData() {
    if (this.isEditMode) return;

    this.dunningSubmitted = true;
    if (this.dunningForm.invalid || !this.createdCustomerId || this.isSavingDunning) return;

    this.isSavingDunning = true;

    this.customerService.saveCredit(this.createdCustomerId, this.dunningForm.value).subscribe({
      next: () => {
        this.isSavingDunning = false;
        this.router.navigate(['/admin/customers']);
      },
      error: () => (this.isSavingDunning = false),
    });
  }

  // UPDATE (kept completely intact)
  updateCustomer() {
    if (!this.isEditMode || !this.customerId || this.isUpdatingCustomer) return;

    this.isUpdatingCustomer = true;

    const payload: any = {};

    Object.assign(payload, this.getUpdatedFields(this.mainForm.value, this.originalData));

    const addr = this.getUpdatedFields(this.addressForm.value, this.originalData.address || {});
    if (Object.keys(addr).length) payload.address = addr;

    const app = this.getUpdatedFields(
      this.applicationForm.value,
      this.originalData.cashApplication || {}
    );
    if (Object.keys(app).length) payload.cashApplication = app;

    const st = this.getUpdatedFields(this.statementForm.value, this.originalData.statement || {});
    if (Object.keys(st).length) payload.statement = st;

    const ef = this.getUpdatedFields(this.eftForm.value, this.originalData.eft || {});
    if (Object.keys(ef).length) payload.eft = ef;

    const vt = this.getUpdatedFields(this.vatForm.value, this.originalData.vat || {});
    if (Object.keys(vt).length) payload.vat = vt;

    const dn = this.getUpdatedFields(this.dunningForm.value, this.originalData.dunning || {});
    if (Object.keys(dn).length) payload.dunning = dn;

    if (!Object.keys(payload).length) {
      alert('No changes detected.');
      this.isUpdatingCustomer = false;
      return;
    }

    this.customerService.updateCustomer(this.customerId, payload).subscribe({
      next: () => {
        this.isUpdatingCustomer = false;
        this.toastService.show('Customer updated successfully.');
        this.router.navigate(['/admin/customers']);
      },
      error: () => {
        this.isUpdatingCustomer = false;
        this.toastService.show('Failed to update customer.', 'error');
      },
    });
  }
}
