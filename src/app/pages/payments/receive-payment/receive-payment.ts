import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Customer } from '../../../services/customer';
import { ToastrService } from 'ngx-toastr';
import { InvoiceService } from '../../../services/invoice-service';
import { PaymentService } from '../../../services/payment-service';

@Component({
  selector: 'app-receive-payment',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, CommonModule, RouterLink],
  templateUrl: './receive-payment.html',
  styleUrl: './receive-payment.css',
})
export class ReceivePayment implements OnInit {
  customers: any[] = [];
  selectedCustomerId: number | null = null;
  amount: number | null = null;
  paymentMethod: string = '';
  invoices: any[] = [];
  notes: string = '';
  showNotesError: boolean = false;

  // Validation flags
  submitted: boolean = false;
  showCustomerError: boolean = false;
  showAmountError: boolean = false;
  showPaymentMethodError: boolean = false;
  showInvoiceError: boolean = false;

  constructor(
    private customerService: Customer,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private invoiceService: InvoiceService,
    private paymentService: PaymentService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('Component initialized');
    this.loadCustomers();
  }

  /** Load customers */
  loadCustomers(): void {
    console.log('Loading customers...');
    this.customerService.getCustomers(0, 100).subscribe({
      next: (res: any) => {
        this.customers = res?.data?.content || [];
        console.log('Customers loaded:', this.customers.length);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.toastr.error('Could not load customers. Please try again.', 'Error');
      },
    });
  }

  /** When customer is selected */
  onCustomerChange() {
    console.log('Customer changed to ID:', this.selectedCustomerId);
    this.showCustomerError = false;

    if (!this.selectedCustomerId) return;

    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      // Reset form
      this.amount = null;
      this.paymentMethod = '';
      this.invoices = [];
      this.showAmountError = false;
      this.showPaymentMethodError = false;
      this.showInvoiceError = false;
      this.cdr.detectChanges();
    });

    console.log('Fetching unpaid invoices for customer:', this.selectedCustomerId);
    this.invoiceService.getUnpaidInvoices(this.selectedCustomerId).subscribe({
      next: (res) => {
        console.log('Unpaid invoices response:', res);
        this.invoices = res?.data || res || [];
        this.invoices.forEach((i) => {
          i.selected = false;
          i.appliedAmount = 0;
        });
        console.log('Loaded invoices:', this.invoices.length);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading unpaid invoices:', err);
        this.toastr.error('Could not load invoices', 'Error');
      },
    });
  }

  /** Handle invoice checkbox selection */
  toggleInvoice(inv: any, event: any) {
    console.log('Toggle invoice called for:', inv.invoiceNumber || inv.id);
    this.showInvoiceError = false;

    const isChecked = event.target.checked;
    console.log('Checkbox checked:', isChecked);

    if (isChecked) {
      // Validate amount first
      if (!this.amount || this.amount <= 0) {
        console.log('Amount validation failed');
        this.toastr.warning('Please enter a payment amount first.');
        event.target.checked = false;
        return;
      }

      // Calculate how much is already applied
      const alreadyApplied = this.invoices
        .filter((i) => i.selected)
        .reduce((sum, i) => sum + (i.appliedAmount || 0), 0);

      const remaining = this.amount - alreadyApplied;
      console.log('Already applied:', alreadyApplied, 'Remaining:', remaining);

      // Check if there's any amount left to apply
      if (remaining <= 0) {
        console.log('No remaining amount to apply');
        this.toastr.warning('Payment amount fully allocated. Uncheck other invoices first.');
        event.target.checked = false;
        return;
      }

      // Apply the lesser of remaining amount or invoice balance
      const amountToApply = Math.min(remaining, inv.balanceDue || 0);
      inv.appliedAmount = amountToApply;
      inv.selected = true;
      console.log('Applied', amountToApply, 'to invoice');
    } else {
      // Deselect invoice
      inv.selected = false;
      inv.appliedAmount = 0;
      console.log('Invoice deselected');
    }

    this.cdr.detectChanges();
  }

  /** Total applied = sum of applied amounts */
  get totalApplied() {
    return this.amount || 0;
  }

  /** Unapplied amount */
  get unappliedAmount() {
    const totalInvoiceAmount = this.invoices.reduce((sum, i) => sum + (i.balanceDue || 0), 0);

    if (!this.amount) return totalInvoiceAmount;

    return totalInvoiceAmount - this.amount;
  }

  /** Get selected invoices count */
  get selectedInvoicesCount(): number {
    return this.invoices.filter((inv) => inv.selected).length;
  }

  /** Check if form is valid */
  isFormValid(): boolean {
    let isValid = true;

    this.showCustomerError = !this.selectedCustomerId;
    this.showAmountError = !this.amount || this.amount <= 0;
    this.showPaymentMethodError = !this.paymentMethod;
    this.showInvoiceError = this.selectedInvoicesCount === 0;
    this.showNotesError = !this.notes || this.notes.trim().length === 0;

    if (
      this.showCustomerError ||
      this.showAmountError ||
      this.showPaymentMethodError ||
      this.showInvoiceError ||
      this.showNotesError
    ) {
      isValid = false;
    }

    return isValid;
  }

  /** Handle Submit */
  onSubmit(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log('========================================');
    console.log('SAVE BUTTON CLICKED');
    console.log('========================================');
    console.log('Customer ID:', this.selectedCustomerId);
    console.log('Amount:', this.amount);
    console.log('Payment Method:', this.paymentMethod);
    console.log('Total Invoices:', this.invoices.length);
    console.log('Selected Invoices:', this.selectedInvoicesCount);
    console.log('========================================');

    this.submitted = true;

    // Validate form
    if (!this.isFormValid()) {
      console.log('FORM VALIDATION FAILED');
      // this.toastr.error('Please fill all required fields correctly.');
      return;
    }

    console.log('Form validation passed');

    // Prepare data for API call
    const selectedInvoices = this.invoices.filter((inv) => inv.selected);

    if (selectedInvoices.length === 0) {
      this.toastr.error('Please select at least one invoice.');
      return;
    }

    const invoiceIds = selectedInvoices.map((inv) => inv.id);

    // Build final payload
    const data = {
      paymentAmount: this.amount,
      paymentMethod: this.paymentMethod,
      notes: this.notes,
      invoiceIds: invoiceIds,
    };

    console.log('FINAL PAYLOAD:', JSON.stringify(data, null, 2));

    // Call the service to apply the payment
    this.paymentService.applyPayment(this.selectedCustomerId!, data).subscribe({
      next: (response) => {
        console.log('PAYMENT SUCCESS:', response);
        this.toastr.success('Payment applied successfully!', 'Success');

        // Navigate to payments page after success
        setTimeout(() => {
          this.router.navigate(['/admin/payments']);
        }, 1000);
      },
      error: (error) => {
        console.error('PAYMENT ERROR:', error);
        const errorMsg = error?.error?.message || error?.message || 'Unknown error occurred';
        this.toastr.error('Failed to apply payment: ' + errorMsg, 'Error');
      },
    });
  }

  /** Reset form (for Cancel button) */
  resetForm() {
    console.log('Cancel clicked - navigating to payments page');
    this.router.navigate(['/admin/payments']);
  }
}
