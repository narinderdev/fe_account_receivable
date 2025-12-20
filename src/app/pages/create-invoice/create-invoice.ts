import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Customer } from '../../services/customer';
import { InvoiceService } from '../../services/invoice-service';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-create-invoice',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyPipe, Spinner],
  templateUrl: './create-invoice.html',
  styleUrl: './create-invoice.css',
})
export class CreateInvoice implements OnInit, OnDestroy {
  customers: any[] = [];
  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;

  formSubmitted = false;
  loading = false;

  invoice: any = {
    customerId: '',
    invoiceNumber: '',
    isGenerated: false,
    invoiceDate: this.getToday(),
    dueDate: '',
    note: '',
    items: [{ itemName: '', description: '', quantity: 1, rate: 0, tax: 0 }],
  };

  constructor(
    private customerService: Customer,
    private invoiceService: InvoiceService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private companySelection: CompanySelectionService
  ) {}

  ngOnInit(): void {
    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
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
          this.cdr.detectChanges();
        }
      });
  }

  // ---------------------------
  // LOAD CUSTOMERS
  // ---------------------------
  loadCustomers(companyId: number): void {
    this.customerService.getCustomers(companyId, 0, 100).subscribe({
      next: (res: any) => {
        this.customers = res?.data?.content || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Could not load customers. Please try again.', 'Error');
      },
    });
  }

  // ---------------------------
  // ITEM ROW ACTIONS
  // ---------------------------
  addItemRow() {
    this.invoice.items.push({
      itemName: '',
      description: '',
      quantity: 1,
      rate: 0,
      tax: 0,
    });
  }

  removeItemRow(index: number) {
    this.invoice.items.splice(index, 1);
  }

  // ---------------------------
  // UTILS
  // ---------------------------
  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  get subtotal(): number {
    return this.invoice.items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.rate,
      0
    );
  }

  get taxAmount(): number {
    return this.invoice.items.reduce((sum: number, item: any) => {
      const st = item.quantity * item.rate;
      return sum + (st * (item.tax || 0)) / 100;
    }, 0);
  }

  get totalAmount(): number {
    return this.subtotal + this.taxAmount;
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

    // Validate manual invoice number
    if (!this.invoice.isGenerated) {
      const num = this.invoice.invoiceNumber?.toString() || '';
      const isValidDigits = /^[0-9]{4}$/.test(num);
      if (!isValidDigits) {
        this.toastr.error('Invoice number must be a 4-digit number.', 'Validation Error');
        return;
      }
    }

    this.loading = true;

    // ---------------------------
    // PAYLOAD CONSTRUCTION
    // ---------------------------
    const payload: any = {
      isGenerated: !!this.invoice.isGenerated,
      invoiceDate: this.invoice.invoiceDate,
      dueDate: this.invoice.dueDate,
      note: this.invoice.note || null,

      items: this.invoice.items.map((item: any) => ({
        itemName: item.itemName,
        rate: item.rate,
        description: item.description,
        quantity: item.quantity,
        tax: item.tax,
      })),
    };

    if (!this.invoice.isGenerated) {
      payload.invoiceNumber = `INV-${this.invoice.invoiceNumber}`;
    }

    const customerId = this.invoice.customerId;

    // ---------------------------
    // CREATE INVOICE
    // ---------------------------
    this.invoiceService.createInvoice(customerId, payload).subscribe({
      next: (res) => {
        this.toastr.success('Invoice created successfully.', 'Success');

        const invoiceId = res?.data?.id;
        if (!invoiceId) {
          this.toastr.error('Could not get invoice ID from response.', 'Error');
          this.loading = false;
          return;
        }

        // ---------------------------
        // SEND INVOICE
        // ---------------------------
        this.invoiceService.sendInvoice(invoiceId).subscribe({
          next: () => {
            this.toastr.success('Invoice sent successfully.', 'Success');
            this.router.navigate(['/admin/invoices']);
          },
          error: (err) => {
            const msg = err?.error?.message || 'Failed to send invoice.';
            this.toastr.error(msg, 'Send Invoice Error');
            this.loading = false;
          },
        });
      },

      error: (err) => {
        const msg = err?.error?.message || 'Unknown error';
        this.toastr.error('Failed to create invoice: ' + msg, 'Error');
        this.loading = false;
      },
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
