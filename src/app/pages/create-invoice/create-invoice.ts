import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Customer } from '../../services/customer';
import { InvoiceService } from '../../services/invoice-service';
import { ToastService } from '../../shared/toast/toast-service';

@Component({
  selector: 'app-create-invoice',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyPipe],
  templateUrl: './create-invoice.html',
  styleUrl: './create-invoice.css',
})
export class CreateInvoice implements OnInit {
  customers: any[] = [];

  formSubmitted = false; // <-- Validation flag

  invoice: any = {
    customerId: '',
    invoiceNumber: '',
    invoiceDate: this.getToday(),
    dueDate: '',
    description: '',
    quantity: 1,
    rate: 0,
    tax: 0,
    note: '',
  };

  constructor(
    private customerService: Customer,
    private invoiceService: InvoiceService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.customerService.getCustomers(0, 100).subscribe({
      next: (res: any) => {
        this.customers = res?.data?.content || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastService.show('Could not load customers. Please try again.', 'error');
      },
    });
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  get subtotal(): number {
    return (this.invoice.quantity || 0) * (this.invoice.rate || 0);
  }

  get taxAmount(): number {
    return (this.subtotal * (this.invoice.tax || 0)) / 100;
  }

  get totalAmount(): number {
    return this.subtotal + this.taxAmount;
  }

  submitInvoice(): void {
    this.formSubmitted = true;

    // ❌ Required field validation
    if (
      !this.invoice.customerId ||
      !this.invoice.invoiceDate ||
      !this.invoice.dueDate ||
      !this.invoice.note ||
      !this.invoice.invoiceNumber
    ) {
      console.warn('Validation failed');
      return;
    }

    const payload = {
      invoiceNumber: this.invoice.invoiceNumber || null,
      invoiceDate: this.invoice.invoiceDate,
      dueDate: this.invoice.dueDate,
      subTotal: this.subtotal,
      taxAmount: this.taxAmount,
      totalAmount: this.totalAmount,
      note: this.invoice.note || null,
      description: this.invoice.description || null,
    };

    const customerId = this.invoice.customerId;

    this.invoiceService.createInvoice(customerId, payload).subscribe({
      next: () => {
        this.toastService.show('Invoice created successfully.');
        this.router.navigate(['/admin/invoices']);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Unknown error';
        this.toastService.show('Failed to create invoice: ' + msg, 'error');
      },
    });
  }
}
