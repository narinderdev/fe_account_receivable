import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Customer } from '../../../services/customer';
import { CommonModule } from '@angular/common';
import { CollectionService } from '../../../services/collection-service';
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

  constructor(
    private route: ActivatedRoute,
    private customerService: Customer,
    private collectionService: CollectionService,
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
