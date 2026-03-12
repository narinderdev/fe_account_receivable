import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Customer } from '../../../services/customer';
import { ToastrService } from 'ngx-toastr';
import { PaymentService } from '../../../services/payment-service';
import { CompanySelectionService } from '../../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { CustomerEntity, PaginatedResponse } from '../../../models/customer.model';
import { ApplyPaymentRequest, ApplyPaymentResponse } from '../../../models/payment.model';
import { Spinner } from '../../../shared/spinner/spinner';

@Component({
  selector: 'app-receive-payment',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, CommonModule, Spinner],
  templateUrl: './receive-payment.html',
  styleUrl: './receive-payment.css',
})
export class ReceivePayment implements OnInit, OnDestroy {
  customers: CustomerEntity[] = [];
  selectedCustomerId: number | null = null;
  selectedCustomer: CustomerEntity | null = null;
  bankDeposit: number | null = null;
  serviceFee: number | null = null;
  paymentMethod: string = '';
  notes: string = '';
  showNotesError: boolean = false;
  bankDepositDisplay: string = '';
  serviceFeeDisplay: string = '';

  // Validation flags
  submitted: boolean = false;
  showCustomerError: boolean = false;
  showBankDepositError: boolean = false;
  showServiceFeeError: boolean = false;
  showPaymentMethodError: boolean = false;
  isSaving = false;
  showCustomerModal = false;
  customerSearchQuery = '';
  currentPage = 0;
  readonly pageSize = 10;
  modalSelectedCustomer: CustomerEntity | null = null;

  constructor(
    private customerService: Customer,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private paymentService: PaymentService,
    private router: Router,
    private companySelection: CompanySelectionService,
  ) {}

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;

  ngOnInit() {
    console.log('Component initialized');
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
        this.selectedCustomerId = null;
        this.selectedCustomer = null;
        this.bankDeposit = null;
        this.serviceFee = null;
        this.paymentMethod = '';
        this.closeCustomerModal();
        this.cdr.detectChanges();
      }
    });
  }

  /** Calculate total amount from bank deposit only */
  get totalAmount(): number {
    const deposit = this.bankDeposit || 0;
    return deposit;
  }

  /** Load customers */
  loadCustomers(companyId: number): void {
    console.log('Loading customers...');
    this.customerService.getCustomers(companyId, 0, 100).subscribe({
      next: (res: { data?: PaginatedResponse<CustomerEntity> }) => {
        this.customers = res?.data?.content || [];
        if (this.selectedCustomerId) {
          const match = this.customers.find((c) => c.id === this.selectedCustomerId) || null;
          this.selectedCustomer = match;
          if (!match) {
            this.selectedCustomerId = null;
          }
        }
        console.log('Customers loaded:', this.customers.length);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.toastr.error('Could not load customers. Please try again.', 'Error');
      },
    });
  }

  get filteredCustomers(): CustomerEntity[] {
    const query = this.customerSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.customers;
    }
    return this.customers.filter((c) => {
      const name = c.customerName?.toLowerCase() || '';
      return name.includes(query);
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredCustomers.length / this.pageSize);
  }

  get pagedCustomers(): CustomerEntity[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredCustomers.slice(start, start + this.pageSize);
  }

  get paginationStart(): number {
    return this.filteredCustomers.length === 0 ? 0 : this.currentPage * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.filteredCustomers.length);
  }

  onBankDepositInput(event: any) {
    const raw = event.target.value.replace(/[^\d.]/g, '');
    this.bankDeposit = raw ? Number(raw) : null;
    this.bankDepositDisplay = raw;
  }

  formatBankDeposit() {
    if (this.bankDeposit == null) {
      this.bankDepositDisplay = '';
      return;
    }

    this.bankDepositDisplay = `$${this.bankDeposit.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  onServiceFeeInput(event: any) {
    const raw = event.target.value.replace(/[^\d.]/g, '');
    this.serviceFee = raw ? Number(raw) : null;
    this.serviceFeeDisplay = raw;
  }

  formatServiceFee() {
    if (this.serviceFee == null) {
      this.serviceFeeDisplay = '';
      return;
    }

    this.serviceFeeDisplay = `$${this.serviceFee.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /** When customer is selected */
  onCustomerChange() {
    console.log('Customer changed to ID:', this.selectedCustomerId);
    this.showCustomerError = false;

    if (!this.selectedCustomerId) return;

    setTimeout(() => {
      this.bankDeposit = null;
      this.bankDepositDisplay = '';
      this.serviceFee = null;
      this.serviceFeeDisplay = '';
      this.paymentMethod = '';
      this.showBankDepositError = false;
      this.showServiceFeeError = false;
      this.showPaymentMethodError = false;
      this.cdr.detectChanges();
    });
  }

  openCustomerModal(): void {
    this.modalSelectedCustomer = this.selectedCustomer;
    this.customerSearchQuery = '';
    this.currentPage = 0;
    this.showCustomerModal = true;
    this.cdr.detectChanges();
  }

  closeCustomerModal(): void {
    this.showCustomerModal = false;
    this.modalSelectedCustomer = null;
    this.cdr.detectChanges();
  }

  confirmCustomerSelection(): void {
    if (!this.modalSelectedCustomer) {
      return;
    }
    this.selectedCustomer = this.modalSelectedCustomer;
    this.selectedCustomerId = this.modalSelectedCustomer.id;
    this.showCustomerModal = false;
    this.modalSelectedCustomer = null;
    this.showCustomerError = false;
    this.onCustomerChange();
    this.cdr.detectChanges();
  }

  onModalCustomerSelect(customer: CustomerEntity): void {
    this.modalSelectedCustomer = customer;
  }

  isModalCustomerSelected(customer: CustomerEntity): boolean {
    return this.modalSelectedCustomer?.id === customer.id;
  }

  onSearchChange(): void {
    this.currentPage = 0;
  }

  goToPrevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }

  /** Check if form is valid */
  isFormValid(): boolean {
    let isValid = true;

    this.showCustomerError = !this.selectedCustomerId;
    this.showBankDepositError = this.bankDeposit == null || this.bankDeposit < 0;
    // Service fee is optional, only validate if provided
    this.showServiceFeeError = this.serviceFee != null && this.serviceFee < 0;
    this.showPaymentMethodError = !this.paymentMethod;
    const trimmedNotes = this.notes.trim();
    this.showNotesError = !trimmedNotes.length;
    this.notes = trimmedNotes;

    if (
      this.showCustomerError ||
      this.showBankDepositError ||
      this.showServiceFeeError ||
      this.showPaymentMethodError ||
      this.showNotesError
    ) {
      isValid = false;
    }

    return isValid;
  }

  /** Handle Submit */
  onSubmit(event?: Event) {
    if (this.isSaving) {
      console.log('Already saving, ignoring duplicate submission');
      return;
    }

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log('========================================');
    console.log('SAVE BUTTON CLICKED');
    console.log('========================================');
    console.log('Customer ID:', this.selectedCustomerId);
    console.log('Bank Deposit:', this.bankDeposit);
    console.log('Service Fee:', this.serviceFee);
    console.log('Total Amount:', this.totalAmount);
    console.log('Payment Method:', this.paymentMethod);
    console.log('========================================');

    this.submitted = true;

    if (!this.isFormValid()) {
      console.log('FORM VALIDATION FAILED');
      return;
    }

    console.log('Form validation passed');

    const data: ApplyPaymentRequest = {
      bankDeposit: this.bankDeposit!,
      serviceFee: this.serviceFee || 0,
      paymentAmount: this.totalAmount,
      paymentMethod: this.paymentMethod,
      notes: this.notes,
    };

    console.log('FINAL PAYLOAD:', JSON.stringify(data, null, 2));
    this.isSaving = true;
    this.cdr.detectChanges();

    this.paymentService.applyPayment(this.selectedCustomerId!, data).subscribe({
      next: (response: ApplyPaymentResponse) => {
        console.log('PAYMENT SUCCESS:', response);
        this.toastr.success(response!.message, 'Success');
        setTimeout(() => {
          this.router.navigate(['/admin/payments']);
        }, 1000);
      },
      error: (error) => {
        console.error('PAYMENT ERROR:', error);
        const errorMsg = error?.error?.message || error?.message || 'Unknown error occurred';
        this.toastr.error('Failed to apply payment: ' + errorMsg, 'Error');

        this.isSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  resetForm() {
    if (this.isSaving) {
      return;
    }

    console.log('Close clicked - navigating to payments page');
    this.router.navigate(['/admin/payments']);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
