import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Customer as CustomerService } from '../../services/customer';
import { InvoiceWithItems } from '../../models/invoice.model';
import { ArCodeService } from '../../services/ar-code-service';
import { WriteOffService } from '../../services/write-off-service';
import { CreateWriteOffPayload, WriteOffEntity } from '../../models/write-off.model';
import { UserContextService } from '../../services/user-context.service';

interface CustomerOption {
  id: number;
  name: string;
}

interface ArCodeOption {
  id: number;
  name: string;
}

interface WriteOffRecord {
  id: number;
  customerName: string;
  invoiceNumber: string;
  reason: string;
  writeOffDate: string | null;
}

@Component({
  selector: 'app-write-off',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Loader, Spinner],
  templateUrl: './write-off.html',
  styleUrl: './write-off.css',
})
export class WriteOff implements OnInit, OnDestroy {
  records: WriteOffRecord[] = [];
  customers: CustomerOption[] = [];
  arCodes: ArCodeOption[] = [];
  customerInvoices: InvoiceWithItems[] = [];
  writeOffForm: FormGroup;
  modalOpen = false;
  submitted = false;
  saving = false;
  loading = true;
  customerInvoicesLoading = false;
  invoiceMessage: string | null = null;
  invoiceMessageIsError = false;
  customersLoading = false;
  arCodesLoading = false;
  writeOffsError: string | null = null;
  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  selectedInvoiceId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService,
    private customerService: CustomerService,
    private arCodeService: ArCodeService,
    private writeOffService: WriteOffService,
    private userContext: UserContextService
  ) {
    this.writeOffForm = this.fb.group({
      customerId: ['', Validators.required],
      invoiceId: [{ value: '', disabled: true }, Validators.required],
      arCodeId: ['', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit() {
    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((companyIdValue) => {
        const companyId = this.normalizeCompanyId(companyIdValue);
        if (companyId === this.activeCompanyId) {
          return;
        }
        this.activeCompanyId = companyId;
        if (!companyId) {
          this.records = [];
          this.writeOffsError = 'Select a company to view write-offs.';
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        this.writeOffsError = null;
        this.loading = true;
        this.cdr.detectChanges();
        this.loadCustomers(companyId, true);
        this.loadArCodes();
        this.loadWriteOffs(companyId);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openModal() {
    if (!this.activeCompanyId) {
      this.toastr.warning('Select a company before creating a write-off.', 'Company Required');
      return;
    }
    this.loadCustomers(this.activeCompanyId, true);
    this.loadArCodes();
    this.resetFormState();
    this.submitted = false;
    this.saving = false;
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.modalOpen = false;
    this.submitted = false;
    this.saving = false;
    this.resetFormState();
    this.cdr.detectChanges();
  }

  handleCustomerSelection(customerIdValue: string | number | null) {
    const invoiceControl = this.writeOffForm.controls['invoiceId'];
    invoiceControl.setValue('');
    this.customerInvoices = [];
    this.invoiceMessage = null;
    this.invoiceMessageIsError = false;
    this.selectedInvoiceId = null;

    const customerId = Number(customerIdValue);
    if (!Number.isFinite(customerId) || customerId <= 0) {
      invoiceControl.disable({ emitEvent: false });
      return;
    }

    invoiceControl.enable({ emitEvent: false });
    this.fetchCustomerInvoices(customerId);
  }

  saveWriteOff() {
    this.submitted = true;
    if (this.writeOffForm.invalid || this.saving) {
      return;
    }

    const companyId = this.activeCompanyId;
    if (!companyId) {
      this.toastr.warning('Select a company before creating a write-off.', 'Company Required');
      return;
    }

    const formValue = this.writeOffForm.getRawValue();
    const invoiceId = Number(formValue.invoiceId);
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      this.toastr.error('Please select an invoice for this write-off.', 'Validation Error');
      return;
    }

    const payload: CreateWriteOffPayload = {
      reason: formValue.reason.trim(),
      arCodeId: Number(formValue.arCodeId),
    };

    this.saving = true;
    this.writeOffService.createWriteOff(payload, companyId, invoiceId).subscribe({
      next: () => {
        this.toastr.success('Write-off created successfully.', 'Success');
        this.saving = false;
        this.closeModal();
        this.loadWriteOffs(companyId);
      },
      error: (error) => {
        const message = error?.error?.message || 'Unable to create write-off.';
        this.toastr.error(message, 'Error');
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  private fetchCustomerInvoices(customerId: number) {
    this.customerInvoicesLoading = true;
    this.invoiceMessage = null;
    this.invoiceMessageIsError = false;
    this.cdr.detectChanges();

    this.customerService.getCustomerInvoicesById(customerId).subscribe({
      next: (response) => {
        this.customerInvoices = response?.data ?? [];
        this.customerInvoicesLoading = false;
        if (this.customerInvoices.length === 0) {
          this.invoiceMessage = 'No invoices found for this customer.';
          this.writeOffForm.controls['invoiceId'].disable({ emitEvent: false });
        } else {
          this.writeOffForm.controls['invoiceId'].enable({ emitEvent: false });
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.customerInvoices = [];
        this.customerInvoicesLoading = false;
        this.invoiceMessage = 'Unable to load invoices.';
        this.invoiceMessageIsError = true;
        this.writeOffForm.controls['invoiceId'].disable({ emitEvent: false });
        this.toastr.error('Unable to load invoices for this customer.', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private loadWriteOffs(companyId: number) {
    this.loading = true;
    this.writeOffsError = null;
    this.cdr.detectChanges();

    this.writeOffService.getCompanyWriteOff(companyId).subscribe({
      next: (response) => {
        const content = response?.data?.content ?? [];
        this.records = content.map((item) => this.transformWriteOff(item));
        this.loading = false;
        this.writeOffsError = null;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.records = [];
        this.loading = false;
        this.writeOffsError = error?.error?.message || 'Unable to load write-offs.';
        this.toastr.error(this.writeOffsError || 'Unable to load write-offs.', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private loadCustomers(companyId: number, force = false) {
    if (!force && this.customers.length > 0) {
      return;
    }
    this.customersLoading = true;
    this.cdr.detectChanges();
    this.customerService.getCustomers(companyId, 0, 100).subscribe({
      next: (res) => {
        const customerList = res?.data?.content ?? [];
        this.customers = customerList.map((customer) => ({
          id: customer.id,
          name: customer.customerName,
        }));
        this.customersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.customers = [];
        this.customersLoading = false;
        this.toastr.error('Unable to load customers.', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private loadArCodes(force = false) {
    if (!force && this.arCodes.length > 0) {
      return;
    }

    const userId = this.userContext.getUserId();
    if (!userId) {
      this.toastr.warning('Unable to load AR codes without user context.', 'Warning');
      return;
    }

    this.arCodesLoading = true;
    this.cdr.detectChanges();
    this.arCodeService.getCode(userId).subscribe({
      next: (res) => {
        const codes = res?.data ?? [];
        this.arCodes = codes.map((code) => ({
          id: code.id,
          name: code.name,
        }));
        this.arCodesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.arCodes = [];
        this.arCodesLoading = false;
        this.toastr.error('Unable to load AR codes.', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private resetFormState() {
    this.writeOffForm.reset({
      customerId: '',
      invoiceId: '',
      arCodeId: '',
      reason: '',
    });
    const invoiceControl = this.writeOffForm.controls['invoiceId'];
    invoiceControl.disable({ emitEvent: false });
    this.customerInvoices = [];
    this.invoiceMessage = null;
    this.invoiceMessageIsError = false;
    this.selectedInvoiceId = null;
  }

  private transformWriteOff(entity: WriteOffEntity): WriteOffRecord {
    return {
      id: entity.id,
      customerName: entity.customerName,
      invoiceNumber: entity.invoiceNumber,
      reason: entity.reason,
      writeOffDate: entity.writeOffDate,
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

  toggleInvoiceSelection(invoiceId: number) {
    const control = this.writeOffForm.controls['invoiceId'];
    if (this.selectedInvoiceId === invoiceId) {
      this.selectedInvoiceId = null;
      control.setValue('');
      return;
    }
    this.selectedInvoiceId = invoiceId;
    control.setValue(invoiceId);
  }

  isInvoiceSelected(invoiceId: number): boolean {
    return this.selectedInvoiceId === invoiceId;
  }

  get selectedInvoiceLabel(): string {
    if (!this.selectedInvoiceId) {
      return '';
    }
    const invoice = this.customerInvoices.find(inv => inv.id === this.selectedInvoiceId);
    return invoice?.invoiceNumber || String(this.selectedInvoiceId);
  }

  getInitialColor(index: number): { background: string; color: string } {
    const palette = [
      { background: '#DBEAFE', color: '#2563EB' },
      { background: '#F3E8FF', color: '#9333EA' },
      { background: '#FFEDD5', color: '#EA580C' },
      { background: '#FEE2E2', color: '#DC2626' },
      { background: '#E0E7FF', color: '#4F46E5' },
      { background: '#CCFBF1', color: '#0D9488' },
    ];

    return palette[index % palette.length];
  }

  getInitial(name?: string | null): string {
    if (!name) {
      return 'U';
    }
    const trimmed = name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'U';
  }
}
