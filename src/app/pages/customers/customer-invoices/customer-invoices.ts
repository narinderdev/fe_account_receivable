import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Customer } from '../../../services/customer';
import { Loader } from '../../../shared/loader/loader';
import { InvoiceWithItems } from '../../../models/invoice.model';

@Component({
  selector: 'app-customer-invoices',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './customer-invoices.html',
  styleUrls: ['./customer-invoices.css'],
})
export class CustomerInvoices implements OnInit {
  customerId: number | null = null;
  invoices: InvoiceWithItems[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private customerService: Customer,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.customerId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCustomerInvoices();
  }

  loadCustomerInvoices() {
    if (!this.customerId) return;

    this.loading = true;

    this.customerService.getCustomerInvoicesById(this.customerId).subscribe({
      next: (res) => {
        this.invoices = Array.isArray(res?.data) ? res.data : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load invoices:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openInvoiceDetail(invoiceId: number) {
    const url = `/admin/customers/${this.customerId}/invoices/${invoiceId}`;

    console.log('Navigating to:', url);

    this.router.navigate(['/admin/customers', this.customerId, 'invoices', invoiceId]);
  }
}
