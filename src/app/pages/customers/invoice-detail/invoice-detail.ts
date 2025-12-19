import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Customer } from '../../../services/customer';
import { Loader } from '../../../shared/loader/loader';
import { InvoiceWithItems } from '../../../models/invoice.model';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './invoice-detail.html',
  styleUrl: './invoice-detail.css',
})
export class InvoiceDetail implements OnInit {
  customerId!: number;
  invoiceId!: number;
  invoice: InvoiceWithItems | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private customerService: Customer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.customerId = Number(this.route.snapshot.paramMap.get('customerId'));
    this.invoiceId = Number(this.route.snapshot.paramMap.get('invoiceId'));

    this.loadInvoiceDetail();
  }

  loadInvoiceDetail() {
    this.loading = true;

    this.customerService.getInvoiceDetail(this.invoiceId).subscribe({
      next: (res) => {
        this.invoice = res?.data || null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load invoice details:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  formatDate(date: string): string {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusClass(): string {
    if (!this.invoice) return 'status-due';
    
    const status = this.invoice.status?.toUpperCase();
    
    if (status === 'PAID' || status === 'COMPLETED') {
      return 'status-paid';
    }
    
    return 'status-due';
  }

  getStatusText(): string {
    if (!this.invoice) return 'OPEN';
    
    const status = this.invoice.status?.toUpperCase();
    
    if (status === 'PAID') return 'PAID';
    if (status === 'COMPLETED') return 'COMPLETED';
    
    return 'OPEN';
  }
}