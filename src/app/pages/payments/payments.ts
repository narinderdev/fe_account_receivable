import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaymentService } from '../../services/payment-service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Loader } from '../../shared/loader/loader';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';
import { FormsModule } from '@angular/forms';
import { Payment } from '../../models/payment.model';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CurrencyPipe, CommonModule, RouterLink, Loader, FormsModule],
  templateUrl: './payments.html',
  styleUrls: ['./payments.css'],
})
export class Payments implements OnInit, OnDestroy {
  payments: Payment[] = [];
  allPayments: Payment[] = [];
  searchName: string = '';
  fromDate: string | null = null;
  toDate: string | null = null;
  loading = false;
  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  canApplyPayment = false;
  currentPage = 0;
  totalPages = 0;
  pageSize = 10;
  totalItems = 0;
  Math = Math;

  constructor(
    private paymentService: PaymentService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService,
    private userContext: UserContextService
  ) {
    this.canApplyPayment = this.userContext.hasPermission('APPLY_PAYMENT');
  }

  ngOnInit() {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;

      if (this.activeCompanyId === nextId) {
        return;
      }

      this.activeCompanyId = nextId;

      if (this.activeCompanyId) {
        this.loadPayments(this.activeCompanyId, 0);
      } else {
        this.payments = [];
        this.allPayments = [];
        this.totalPages = 0;
        this.currentPage = 0;
        this.totalItems = 0;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadPayments(companyId: number, page: number = 0): void {
    this.loading = true;
    this.cdr.detectChanges();

    const filters = {
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      page,
      size: this.pageSize,
    };

    this.paymentService.getFilteredPayments(companyId, filters).subscribe({
      next: (response) => {
        const pageData = response?.data;

        this.payments = pageData?.content || [];
        this.allPayments = [...this.payments];
        this.totalPages = pageData?.totalPages || 0;
        this.currentPage = pageData?.number || 0;
        this.totalItems = pageData?.totalElements || 0;
        localStorage.setItem('paymentsData', JSON.stringify(this.payments));

        this.loading = false;
        this.applySearchFilter();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading payments:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearchChange(): void {
    this.applySearchFilter();
  }

  handleFromDateChange(value: string) {
    this.fromDate = value || null;
    this.reloadWithFilters();
  }

  handleToDateChange(value: string) {
    this.toDate = value || null;
    this.reloadWithFilters();
  }

  private reloadWithFilters() {
    if (!this.activeCompanyId) {
      return;
    }
    this.currentPage = 0;
    this.loadPayments(this.activeCompanyId, 0);
  }

  private applySearchFilter() {
    const term = this.searchName.trim().toLowerCase();

    if (term.length < 3) {
      this.payments = [...this.allPayments];
      return;
    }

    this.payments = this.allPayments.filter((payment) => {
      const customerName = this.getCustomerName(payment).toLowerCase();
      return customerName.includes(term);
    });
  }

  /** Sum of applied amounts */
  getAppliedAmount(payment: Payment): number {
    return (
      payment.applications?.reduce(
        (total: number, app: any) => total + (app.appliedAmount || 0),
        0
      ) || 0
    );
  }

  /** Get customer name from payment */
  getCustomerName(payment: Payment): string {
    // Try to get customer from the nested path in applications
    const customerName = payment?.applications?.[0]?.invoice?.customer?.customerName;
    if (customerName) {
      return customerName;
    }

    // Fallback to direct customer property if it exists
    return payment?.customer?.customerName || '--';
  }

  getInvoiceStatus(payment: Payment): string {
    const status = payment?.applications?.[0]?.invoice?.status;
    if (!status) {
      return '--';
    }

    return status
      .toLowerCase()
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getStatusClass(payment: Payment): string {
    const status = payment?.applications?.[0]?.invoice?.status?.toUpperCase();
    const classes: { [key: string]: string } = {
      OPEN: 'status-open',
      PARTIAL: 'status-partial',
      PAID: 'status-paid',
    };

    return classes[status || ''] || 'status-default';
  }

  getCustomerInitial(payment: Payment): string {
    const name = this.getCustomerName(payment);
    if (!name || name === '--') {
      return '?';
    }
    return name.trim().charAt(0).toUpperCase();
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
    const colorIndex = index % palette.length;
    return palette[colorIndex];
  }

  openPaymentDetails(paymentId: number) {
    this.router.navigate(['/admin/payments/details', paymentId]);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const current = this.currentPage + 1;
    const total = this.totalPages;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current <= 3) {
        pages.push(2, 3, 4, -1, total);
      } else if (current >= total - 2) {
        pages.push(-1, total - 3, total - 2, total - 1, total);
      } else {
        pages.push(-1, current - 1, current, current + 1, -1, total);
      }
    }

    return pages;
  }

  goToPage(page: number) {
    if (this.activeCompanyId && page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.loadPayments(this.activeCompanyId, page);
    }
  }

  nextPage() {
    if (this.activeCompanyId && this.currentPage < this.totalPages - 1) {
      this.loadPayments(this.activeCompanyId, this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.activeCompanyId && this.currentPage > 0) {
      this.loadPayments(this.activeCompanyId, this.currentPage - 1);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
