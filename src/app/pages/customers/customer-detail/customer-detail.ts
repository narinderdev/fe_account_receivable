import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Customer } from '../../../services/customer';
import { CommonModule } from '@angular/common';
import { CollectionService } from '../../../services/collection-service';
import { MonthEndService } from '../../../services/month-end-service';
import { FormsModule } from '@angular/forms';
import { CustomerDetail as CustomerDetailEntity } from '../../../models/customer.model';
import { InvoiceWithItems } from '../../../models/invoice.model';
import { PromiseToPayRecord } from '../../../models/promise-to-pay.model';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-detail.html',
  styleUrl: './customer-detail.css',
})
export class CustomerDetail implements OnInit {
  customerId!: number;
  customerData: CustomerDetailEntity | null = null;
  invoicesData: InvoiceWithItems[] = [];
  activeTab: string = 'basic';
  customerPromises: PromiseToPayRecord[] = [];
  loadingPromises = false;

  // ✅ Add month-end balance properties
  monthEndBalance: number | null = null;
  loadingMonthEnd = false;

  constructor(
    private route: ActivatedRoute,
    private customerService: Customer,
    private collectionService: CollectionService,
    private monthEndService: MonthEndService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.customerId = Number(idParam);

    if (!this.customerId) {
      console.error('Invalid customer id in route:', idParam);
      return;
    }

    forkJoin({
      customer: this.customerService.getCustomerById(this.customerId),
      invoices: this.customerService.getCustomerInvoicesById(this.customerId),
    }).subscribe({
      next: ({ customer, invoices }) => {
        console.log('Customer response:', customer);
        console.log('Customer invoices response:', invoices);

        this.customerData = customer.data;
        this.invoicesData = Array.isArray(invoices.data) ? invoices.data : [];

        // force Angular to re-check the view
        this.cdr.detectChanges();

        this.loadCustomerPromises();
        // ✅ Load month-end balance
        this.loadMonthEndBalance();
      },
      error: (err) => {
        console.error('Error loading customer detail:', err);
      },
    });
  }

  loadCustomerPromises() {
    this.loadingPromises = true;
    this.cdr.detectChanges();

    this.collectionService.getCustomerPromise(this.customerId).subscribe({
      next: (response) => {
        this.customerPromises = Array.isArray(response?.data) ? response.data : [];
        this.loadingPromises = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading customer promises:', err);
        this.customerPromises = [];
        this.loadingPromises = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ✅ Load month-end balance for customer
  loadMonthEndBalance() {
    this.loadingMonthEnd = true;

    // Get current month in YYYY-MM format
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    this.monthEndService.getCustomerMonthEnd(this.customerId, month).subscribe({
      next: (response) => {
        this.monthEndBalance = response?.data?.monthEndBalance ?? null;
        this.loadingMonthEnd = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading month-end balance:', err);
        this.monthEndBalance = null;
        this.loadingMonthEnd = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ✅ Format currency for display
  formatCurrency(amount: number | null): string {
    if (amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      PENDING: 'Pending',
      DUE_TODAY: 'Due Today',
      BROKEN: 'Broken',
      COMPLETED: 'Completed',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      PENDING: 'status-pending',
      DUE_TODAY: 'status-due-today',
      BROKEN: 'status-broken',
      COMPLETED: 'status-completed',
    };
    return classes[status] || 'status-default';
  }
}
