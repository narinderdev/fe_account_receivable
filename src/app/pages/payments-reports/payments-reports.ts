import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Subject, takeUntil } from 'rxjs';
import { PaymentService } from '../../services/payment-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Loader } from '../../shared/loader/loader';

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
  bankDeposit?: number;
  serviceFee?: number;
  paymentAmount: number;
  paymentMethod: string;
  paymentDate: string;
  notes: string;
  applications: Application[];
}

@Component({
  selector: 'app-payments-reports',
  standalone: true,
  imports: [CurrencyPipe, CommonModule, FormsModule, Loader],
  templateUrl: './payments-reports.html',
  styleUrl: './payments-reports.css',
})
export class PaymentsReports implements OnInit, OnDestroy {
  payments: Payment[] = [];
  allPayments: Payment[] = [];
  loading = false;
  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  currentPage = 0;
  totalPages = 0;
  pageSize = 10;
  totalItems = 0;
  Math = Math;
  searchName = '';
  fromDate: string | null = null;
  toDate: string | null = null;

  constructor(
    private paymentService: PaymentService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService
  ) {}

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
          this.loadPayments(this.activeCompanyId, 0);
        } else {
          this.resetState();
          this.cdr.detectChanges();
        }
      });
  }

  private resetState() {
    this.payments = [];
    this.allPayments = [];
    this.totalPages = 0;
    this.currentPage = 0;
    this.totalItems = 0;
    this.loading = false;
    this.searchName = '';
    this.fromDate = null;
    this.toDate = null;
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
        this.totalItems = pageData?.totalElements || this.allPayments.length;

        this.loading = false;
        this.applySearchFilter();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getAppliedAmount(payment: Payment): number {
    return (
      payment.applications?.reduce(
        (total: number, app: Application) => total + app.appliedAmount,
        0
      ) || 0
    );
  }

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

  onSearchChange() {
    this.applySearchFilter();
  }

  private applySearchFilter() {
    const term = this.searchName.trim().toLowerCase();
    if (term.length < 3) {
      this.payments = [...this.allPayments];
      return;
    }

    this.payments = this.allPayments.filter((payment) =>
      this.getCustomerName(payment).toLowerCase().includes(term)
    );
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
    if (
      this.activeCompanyId &&
      page >= 0 &&
      page < this.totalPages &&
      page !== this.currentPage
    ) {
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

  formatDateValue(date: string | null): string {
    if (!date) {
      return '';
    }
    return new Date(date).toLocaleDateString('en-US');
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  handleFromDateChange(value: string) {
    this.fromDate = value || null;
    this.reloadWithFilters();
    this.cdr.detectChanges();
  }

  handleToDateChange(value: string) {
    this.toDate = value || null;
    this.reloadWithFilters();
    this.cdr.detectChanges();
  }

  private reloadWithFilters() {
    if (!this.activeCompanyId) {
      return;
    }
    this.currentPage = 0;
    this.loadPayments(this.activeCompanyId, 0);
  }

  async generatePdf() {
    const element = document.getElementById('paymentsReportsTable');
    if (!element) {
      console.error('Payments report table not found.');
      return;
    }

    const filterSummary = element.querySelector('.pdf-filter-summary') as HTMLElement | null;
    if (filterSummary) {
      filterSummary.style.display = 'block';
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    if (filterSummary) {
      filterSummary.style.display = 'none';
    }

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save('payments-report.pdf');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
