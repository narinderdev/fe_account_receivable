import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Customer } from '../../services/customer';
import { InvoiceService } from '../../services/invoice-service';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, catchError, map, of, switchMap, takeUntil } from 'rxjs';
import { CustomerEntity, PaginatedResponse } from '../../models/customer.model';
import {
  InvoiceDetailResponse,
  RecurringFrequency,
  RecurringInvoiceRequest,
} from '../../models/invoice.model';

interface InvoiceItemDraft {
  itemName: string;
  description: string;
  quantity: string;
  rate: string;
  rateDisplay: string; // For displaying formatted value
  tax: string;
}

interface InvoiceDraft {
  customerId: number | '';
  invoiceNumber: string;
  isGenerated: boolean;
  invoiceDate: string;
  dueDate: string;
  county: string;
  note: string;
  items: InvoiceItemDraft[];
  isRecurring: boolean;
  recurringFrequency: RecurringFrequency | '';
  recurringStartDate: string;
  recurringEndAfter: string;
}

interface CreateInvoicePayload {
  invoiceNumber?: string;
  isGenerated: boolean;
  invoiceDate: string;
  dueDate: string;
  county: string | null;
  note: string | null;
  items: Array<{
    itemName: string;
    rate: number;
    description: string;
    quantity: number;
    tax: number;
  }>;
}

@Component({
  selector: 'app-create-invoice',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyPipe, Spinner],
  templateUrl: './create-invoice.html',
  styleUrl: './create-invoice.css',
})
export class CreateInvoice implements OnInit, OnDestroy {
  customers: CustomerEntity[] = [];
  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  readonly today = this.getToday();

  formSubmitted = false;
  loading = false;
  selectedCustomer: CustomerEntity | null = null;

  invoice: InvoiceDraft = {
    customerId: '',
    invoiceNumber: '',
    isGenerated: false,
    invoiceDate: this.today,
    dueDate: '',
    county: '',
    note: '',
    isRecurring: false,
    recurringFrequency: '',
    recurringStartDate: '',
    recurringEndAfter: '',
    items: [
      {
        itemName: '',
        description: '',
        quantity: '1',
        rate: '',
        rateDisplay: '',
        tax: '',
      },
    ],
  };

  constructor(
    private customerService: Customer,
    private invoiceService: InvoiceService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private companySelection: CompanySelectionService,
  ) {}

  readonly recurringFrequencyOptions = [
    { label: 'Daily', value: 'DAILY' as RecurringFrequency },
    { label: 'Weekly', value: 'WEEKLY' as RecurringFrequency },
    { label: 'Monthly', value: 'MONTHLY' as RecurringFrequency },
    { label: 'Yearly', value: 'YEARLY' as RecurringFrequency },
  ];

  ngOnInit(): void {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;

      if (this.activeCompanyId === nextId) {
        return;
      }

      this.activeCompanyId = nextId;

      if (this.activeCompanyId) {
        this.loadCustomers(this.activeCompanyId);
      } else {
        this.customers = [];
        this.invoice.customerId = '';
        this.selectedCustomer = null;
        this.cdr.detectChanges();
      }
    });
  }

  // ---------------------------
  // LOAD CUSTOMERS
  // ---------------------------
  loadCustomers(companyId: number): void {
    this.customerService.getCustomers(companyId, 0, 100).subscribe({
      next: (res: { data?: PaginatedResponse<CustomerEntity> }) => {
        this.customers = res?.data?.content || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Could not load customers. Please try again.', 'Error');
      },
    });
  }

  // ---------------------------
  // INPUT VALIDATION METHODS
  // ---------------------------
  onlyDigits(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow: backspace, delete, tab, escape, enter
    if (
      [46, 8, 9, 27, 13].indexOf(charCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (charCode === 65 && event.ctrlKey === true) ||
      (charCode === 67 && event.ctrlKey === true) ||
      (charCode === 86 && event.ctrlKey === true) ||
      (charCode === 88 && event.ctrlKey === true)
    ) {
      return true;
    }
    // Ensure that it is a number and stop the keypress
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onlyDigitsAndDecimal(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    const inputValue = (event.target as HTMLInputElement).value;

    // Allow: backspace, delete, tab, escape, enter
    if (
      [46, 8, 9, 27, 13].indexOf(charCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (charCode === 65 && event.ctrlKey === true) ||
      (charCode === 67 && event.ctrlKey === true) ||
      (charCode === 86 && event.ctrlKey === true) ||
      (charCode === 88 && event.ctrlKey === true)
    ) {
      return true;
    }

    // Allow decimal point only once
    if (charCode === 46) {
      if (inputValue.indexOf('.') !== -1) {
        event.preventDefault();
        return false;
      }
      return true;
    }

    // Ensure that it is a number
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onPaste(event: ClipboardEvent): void {
    const pastedText = event.clipboardData?.getData('text');
    if (pastedText && !/^\d*\.?\d*$/.test(pastedText)) {
      event.preventDefault();
    }
  }

  validateTax(item: InvoiceItemDraft): void {
    const taxValue = parseFloat(item.tax);
    if (!isNaN(taxValue) && taxValue > 50) {
      item.tax = '50';
    }
  }

  // ---------------------------
  // RATE FORMATTING METHODS
  // ---------------------------
  onRateInput(item: InvoiceItemDraft, event: any): void {
  const input = event.target.value.replace(/[^\d.]/g, '');
  item.rate = input;
  item.rateDisplay = input;
}


  formatRateOnBlur(item: InvoiceItemDraft): void {
  if (!item.rate) {
    item.rateDisplay = '';
    return;
  }

  const numericValue = parseFloat(item.rate);
  if (isNaN(numericValue)) {
    item.rateDisplay = '';
    item.rate = '';
    return;
  }

  item.rateDisplay = `$${this.formatNumberWithCommas(numericValue)}`;
}


  removeRateFormatting(item: InvoiceItemDraft): void {
    // When focused, show the raw number without formatting
    item.rateDisplay = item.rate;
  }

  private formatNumberWithCommas(value: number): string {
    const parts = value.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  // ---------------------------
  // CUSTOMER SELECTION
  // ---------------------------
  onCustomerChange(): void {
    if (!this.invoice.customerId) {
      this.selectedCustomer = null;
      return;
    }

    const customerId = Number(this.invoice.customerId);
    this.selectedCustomer = this.customers.find((c) => c.id === customerId) || null;
    this.cdr.detectChanges();
  }

  // ---------------------------
  // CREDIT LIMIT CHECK
  // ---------------------------
  get customerCreditLimit(): number {
    return this.selectedCustomer?.dunning?.creditLimit || 0;
  }

  get exceedsCreditLimit(): boolean {
    if (!this.selectedCustomer || !this.customerCreditLimit) {
      return false;
    }
    return this.totalAmount > this.customerCreditLimit;
  }

  get creditLimitExceededAmount(): number {
    return this.totalAmount - this.customerCreditLimit;
  }

  // ---------------------------
  // ITEM ROW ACTIONS
  // ---------------------------
  addItemRow() {
    this.invoice.items.push({
      itemName: '',
      description: '',
      quantity: '1',
      rate: '',
      rateDisplay: '',
      tax: '',
    });
  }

  removeItemRow(index: number) {
    this.invoice.items.splice(index, 1);
  }

  // ---------------------------
  // UTILS
  // ---------------------------
  private getToday(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get subtotal(): number {
    return this.invoice.items.reduce((sum: number, item: InvoiceItemDraft) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      return sum + qty * rate;
    }, 0);
  }

  get taxAmount(): number {
    return this.invoice.items.reduce((sum: number, item: InvoiceItemDraft) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const tax = parseFloat(item.tax) || 0;
      const st = qty * rate;
      return sum + (st * tax) / 100;
    }, 0);
  }

  get totalAmount(): number {
    return this.subtotal + this.taxAmount;
  }

  get dueDateMin(): string {
    return this.invoice.invoiceDate || this.today;
  }

  get isInvoiceDateInFuture(): boolean {
    if (!this.invoice.invoiceDate) {
      return false;
    }
    return new Date(this.invoice.invoiceDate) > new Date(this.today);
  }

  get isDueDateBeforeInvoiceDate(): boolean {
    if (!this.invoice.dueDate || !this.invoice.invoiceDate) {
      return false;
    }
    return new Date(this.invoice.dueDate) < new Date(this.invoice.invoiceDate);
  }

  get showRecurringFrequencyError(): boolean {
    return this.formSubmitted && this.invoice.isRecurring && !this.invoice.recurringFrequency;
  }

  get showRecurringStartDateError(): boolean {
    return this.formSubmitted && this.invoice.isRecurring && !this.invoice.recurringStartDate;
  }

  get showRecurringEndAfterError(): boolean {
    return (
      this.formSubmitted &&
      this.invoice.isRecurring &&
      this.parsePositiveInteger(this.invoice.recurringEndAfter) === null
    );
  }

  onRecurringToggle(): void {
    if (!this.invoice.isRecurring) {
      this.invoice.recurringFrequency = '';
      this.invoice.recurringStartDate = '';
      this.invoice.recurringEndAfter = '';
      return;
    }

    if (!this.invoice.recurringStartDate) {
      this.invoice.recurringStartDate = this.invoice.invoiceDate || this.today;
    }
  }

  private parsePositiveInteger(value: string): number | null {
    const trimmed = value?.toString().trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private buildRecurringInvoicePayload(
    customerId: number,
    items: CreateInvoicePayload['items'],
    endAfter: number,
  ): RecurringInvoiceRequest {
    return {
      customerId,
      startDate: this.invoice.recurringStartDate,
      frequency: this.invoice.recurringFrequency as RecurringFrequency,
      endAfter,
      items,
    };
  }

  // ---------------------------
  // SUBMIT INVOICE
  // ---------------------------
  submitInvoice(): void {
    this.formSubmitted = true;

    // Validate mandatory fields
    if (
      !this.invoice.customerId ||
      !this.invoice.invoiceDate ||
      !this.invoice.dueDate ||
      !this.invoice.note ||
      (!this.invoice.isGenerated && !this.invoice.invoiceNumber)
    ) {
      return;
    }

    if (this.isInvoiceDateInFuture) {
      this.toastr.error('Invoice date cannot be in the future.', 'Validation Error');
      return;
    }

    if (this.isDueDateBeforeInvoiceDate) {
      this.toastr.error('Due date cannot be before the invoice date.', 'Validation Error');
      return;
    }

    // Check credit limit
    // if (this.exceedsCreditLimit) {
    //   this.toastr.error(
    //     `Invoice total ($${this.totalAmount.toFixed(
    //       2,
    //     )}) exceeds customer's credit limit ($${this.customerCreditLimit.toFixed(2)})`,
    //     'Credit Limit Exceeded',
    //   );
    //   return;
    // }

    // Validate manual invoice number
    if (!this.invoice.isGenerated) {
      const num = this.invoice.invoiceNumber?.toString() || '';
      const isValidDigits = /^[0-9]{4}$/.test(num);
      if (!isValidDigits) {
        this.toastr.error('Invoice number must be a 4-digit number.', 'Validation Error');
        return;
      }
    }

    let recurringEndAfterValue: number | null = null;
    if (this.invoice.isRecurring) {
      recurringEndAfterValue = this.parsePositiveInteger(this.invoice.recurringEndAfter);

      if (
        !this.invoice.recurringFrequency ||
        !this.invoice.recurringStartDate ||
        !recurringEndAfterValue
      ) {
        this.toastr.error('Please complete the recurring payment fields.', 'Validation Error');
        return;
      }
    }

    this.loading = true;

    // ---------------------------
    // PAYLOAD CONSTRUCTION
    // ---------------------------
    const normalizedItems = this.invoice.items.map((item: InvoiceItemDraft) => ({
      itemName: item.itemName,
      rate: parseFloat(item.rate) || 0,
      description: item.description,
      quantity: parseFloat(item.quantity) || 0,
      tax: parseFloat(item.tax) || 0,
    }));

    const payload: CreateInvoicePayload = {
      isGenerated: !!this.invoice.isGenerated,
      invoiceDate: this.invoice.invoiceDate,
      dueDate: this.invoice.dueDate,
      county: this.invoice.county?.trim() || null,
      note: this.invoice.note || null,
      items: normalizedItems,
    };

    if (!this.invoice.isGenerated) {
      payload.invoiceNumber = `INV-${this.invoice.invoiceNumber}`;
    }

    const customerId = Number(this.invoice.customerId);
    if (!Number.isFinite(customerId)) {
      this.toastr.error('Please select a valid customer.', 'Validation Error');
      this.loading = false;
      return;
    }

    // ---------------------------
    // CREATE INVOICE
    // ---------------------------
    this.invoiceService
      .createInvoice(customerId, payload)
      .pipe(
        switchMap((res: InvoiceDetailResponse) => {
          if (!this.invoice.isRecurring) {
            return of({ invoiceResponse: res, recurringCreated: false });
          }

          const recurringPayload = this.buildRecurringInvoicePayload(
            customerId,
            normalizedItems,
            recurringEndAfterValue as number,
          );

          return this.invoiceService.recurringInvoice(recurringPayload).pipe(
            map(() => ({ invoiceResponse: res, recurringCreated: true })),
            catchError((err) => {
              const msg = err?.error?.message || 'Unknown error';
              this.toastr.error(
                'Recurring schedule could not be saved: ' + msg,
                'Recurring Error',
              );
              return of({ invoiceResponse: res, recurringCreated: false });
            }),
          );
        }),
      )
      .subscribe({
        next: ({ recurringCreated }) => {
          this.loading = false;
          const successMessage = recurringCreated
            ? 'Invoice and recurring schedule created successfully.'
            : 'Invoice created successfully.';
          this.toastr.success(successMessage, 'Success');
          this.router.navigate(['/admin/invoices']);
          this.cdr.detectChanges();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Unknown error';
          this.toastr.error('Failed to create invoice: ' + msg, 'Error');
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
