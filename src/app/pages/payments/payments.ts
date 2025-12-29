import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaymentService } from '../../services/payment-service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Loader } from '../../shared/loader/loader';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';

interface InvoiceCustomer {
  customerName: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  balanceDue: number;
  status?: string;
  customer: InvoiceCustomer;
}

interface Application {
  id: number;
  invoice: Invoice;
  appliedAmount: number;
}

interface Payment {
  id: number;
  paymentAmount: number;
  paymentMethod: string;
  paymentDate: string;
  notes: string;
  applications: Application[];
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CurrencyPipe, CommonModule, RouterLink, Loader],
  templateUrl: './payments.html',
  styleUrls: ['./payments.css'],
})
export class Payments implements OnInit, OnDestroy {
  payments: Payment[] = [];
  loading = false;
  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  canApplyPayment = false;

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
          this.loadPayments(this.activeCompanyId);
        } else {
          this.payments = [];
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadPayments(companyId: number): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.paymentService.getPayments(companyId).subscribe({
      next: (response) => {
        this.payments = response?.data?.content || [];
        localStorage.setItem('paymentsData', JSON.stringify(this.payments));

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading payments:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Sum of applied amounts */
  getAppliedAmount(payment: Payment): number {
    return (
      payment.applications?.reduce(
        (total: number, app: Application) => total + app.appliedAmount,
        0
      ) || 0
    );
  }

  /** Get customer name from first application */
  getCustomerName(payment: Payment): string {
    return payment?.applications?.[0]?.invoice?.customer?.customerName || '--';
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
