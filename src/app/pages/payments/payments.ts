import {
  Component,
  OnInit,
  ChangeDetectorRef,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaymentService } from '../../services/payment-service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Loader } from '../../shared/loader/loader';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';
import { FormsModule } from '@angular/forms';
import { BankTransaction, Payment } from '../../models/payment.model';
import { Spinner } from '../../shared/spinner/spinner';
import { ToastrService } from 'ngx-toastr';

type PaymentType = 'MANUAL' | 'BANK';

interface PaymentListItem {
  id: number;
  type: PaymentType;
  customerName: string;
  status?: string;
  amount: number;
  description?: string;
  source?: string;
  date?: string;
  manualPayment?: Payment;
  bankTransaction?: BankTransaction;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CurrencyPipe, CommonModule, RouterLink, Loader, FormsModule, Spinner],
  templateUrl: './payments.html',
  styleUrls: ['./payments.css'],
})
export class Payments implements OnInit, OnDestroy {
  @ViewChild('baiFileInput') baiFileInput?: ElementRef<HTMLInputElement>;

  payments: PaymentListItem[] = [];
  allPayments: PaymentListItem[] = [];
  filteredPayments: PaymentListItem[] = [];
  searchName: string = '';

  // New filter properties
  selectedPeriod: string = '12'; // Default to 12 months
  isCustomPeriod: boolean = false;
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
  isBaiModalOpen = false;
  uploadingBai = false;

  // Period options for dropdown
  periodOptions = [
    { value: '1', label: 'Last 1 Month' },
    { value: '2', label: 'Last 2 Months' },
    { value: '6', label: 'Last 6 Months' },
    { value: '12', label: 'Last 12 Months' },
    { value: 'custom', label: 'Custom Date Range' },
  ];

  constructor(
    private paymentService: PaymentService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService,
    private userContext: UserContextService,
    private toastr: ToastrService,
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
        this.loadPayments(this.activeCompanyId);
      } else {
        this.payments = [];
        this.allPayments = [];
        this.filteredPayments = [];
        this.totalPages = 0;
        this.currentPage = 0;
        this.totalItems = 0;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadPayments(companyId: number): void {
    const dateRange = this.buildDateRange();
    if (this.isCustomPeriod && !dateRange) {
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const manualFilters = this.buildManualFilters(dateRange);
    const bankMonths = this.resolveBankMonths();

    forkJoin({
      bank: this.paymentService.getPayments(companyId, { months: bankMonths }),
      manual: this.paymentService.getManualPayments(companyId, manualFilters),
    }).subscribe({
      next: ({ bank, manual }) => {
        const manualContent = manual?.data?.content ?? [];
        const bankContent = bank?.data ?? [];

        const manualEntries = manualContent.map((payment) => this.mapManualPayment(payment));
        const bankEntries = bankContent.map((payment) => this.mapBankTransaction(payment));

        const combined = this.sortPaymentsByDate([...manualEntries, ...bankEntries]);

        this.allPayments = combined;
        this.filteredPayments = [...combined];
        this.currentPage = 0;
        localStorage.setItem('paymentsData', JSON.stringify(combined));

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

  // Handle period dropdown change
  onPeriodChange(): void {
    if (this.selectedPeriod === 'custom') {
      this.isCustomPeriod = true;
      // Don't reload until user selects dates
    } else {
      this.isCustomPeriod = false;
      this.fromDate = null;
      this.toDate = null;
      this.reloadWithFilters();
    }
  }

  // Handle custom date changes
  handleFromDateChange(value: string) {
    this.fromDate = value || null;
    if (this.isCustomPeriod && this.fromDate && this.toDate) {
      this.reloadWithFilters();
    }
  }

  handleToDateChange(value: string) {
    this.toDate = value || null;
    if (this.isCustomPeriod && this.fromDate && this.toDate) {
      this.reloadWithFilters();
    }
  }

  openBaiModal() {
    if (!this.activeCompanyId) {
      this.toastr.warning('Please select an AR company from the navbar first.', 'Warning');
      return;
    }
    this.isBaiModalOpen = true;
    this.cdr.detectChanges();
  }

  closeBaiModal() {
    if (this.uploadingBai) {
      return;
    }
    this.isBaiModalOpen = false;
    this.resetBaiFileInput();
    this.cdr.detectChanges();
  }

  handleBaiFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (extension !== 'txt') {
      this.toastr.warning('Please upload a .txt BAI file.', 'Invalid File');
      input.value = '';
      return;
    }

    if (!this.activeCompanyId) {
      this.toastr.warning('Please select an AR company from the navbar first.', 'Warning');
      input.value = '';
      return;
    }

    this.uploadingBai = true;
    this.cdr.detectChanges();

    this.paymentService.uploadBaiFile(this.activeCompanyId, file).subscribe({
      next: () => {
        this.uploadingBai = false;
        this.toastr.success('BAI file uploaded successfully.', 'Success');
        input.value = '';
        if (this.activeCompanyId) {
          this.loadPayments(this.activeCompanyId);
        }
        this.closeBaiModal();
      },
      error: (error) => {
        this.uploadingBai = false;
        console.error('Failed to upload BAI file:', error);
        const backendMessage = error?.error?.message;
        this.toastr.error(backendMessage || 'Failed to upload BAI file.', 'Upload Failed');
        input.value = '';
        this.cdr.detectChanges();
      },
    });
  }

  private reloadWithFilters() {
    if (!this.activeCompanyId) {
      return;
    }
    this.currentPage = 0;
    this.loadPayments(this.activeCompanyId);
  }

  private applySearchFilter() {
    const term = this.searchName.trim().toLowerCase();

    if (term.length < 3) {
      this.filteredPayments = [...this.allPayments];
    } else {
      this.filteredPayments = this.allPayments.filter((payment) => {
        const customerName = payment.customerName?.toLowerCase() || '';
        return customerName.includes(term);
      });
    }

    this.currentPage = 0;
    this.updatePagination();
  }

  private updatePagination() {
    this.totalItems = this.filteredPayments.length;
    this.totalPages = this.totalItems === 0 ? 0 : Math.ceil(this.totalItems / this.pageSize);

    if (this.totalPages === 0) {
      this.currentPage = 0;
    } else if (this.currentPage >= this.totalPages) {
      this.currentPage = this.totalPages - 1;
    }

    this.updatePagedPayments();
  }

  private updatePagedPayments() {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.payments = this.filteredPayments.slice(start, end);
  }

  private buildDateRange(): { fromDate: string; toDate: string } | null {
    if (this.isCustomPeriod) {
      if (this.fromDate && this.toDate) {
        return { fromDate: this.fromDate, toDate: this.toDate };
      }
      return null;
    }

    const months = parseInt(this.selectedPeriod, 10);
    const monthsToSubtract = Number.isFinite(months) ? months : 1;
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - monthsToSubtract);

    return {
      fromDate: this.formatDateForApi(start),
      toDate: this.formatDateForApi(end),
    };
  }

  private formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getStatusLabel(payment: PaymentListItem): string {
    const status = payment?.status;
    if (!status) {
      return '--';
    }

    return status
      .toLowerCase()
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getStatusClass(payment: PaymentListItem): string {
    const status = payment?.status?.toUpperCase();
    const classes: { [key: string]: string } = {
      OPEN: 'status-open',
      PARTIAL: 'status-partial',
      PAID: 'status-paid',
      DRAFT: 'status-default',
    };

    return classes[status || ''] || 'status-default';
  }

  getCustomerInitial(payment: PaymentListItem): string {
    const name = payment?.customerName;
    if (!name || name === '--') {
      return '?';
    }
    return name.trim().charAt(0).toUpperCase();
  }

  formatSource(source?: string): string {
    if (!source) {
      return '--';
    }
    return source
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagedPayments();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage += 1;
      this.updatePagedPayments();
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage -= 1;
      this.updatePagedPayments();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetBaiFileInput() {
    if (this.baiFileInput) {
      this.baiFileInput.nativeElement.value = '';
    }
  }

  private buildManualFilters(dateRange: { fromDate: string; toDate: string } | null) {
    if (this.isCustomPeriod) {
      if (!dateRange) {
        throw new Error('Custom date range is required for manual payment filtering.');
      }
      return {
        page: 0,
        size: this.pageSize,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      };
    }
    const months = parseInt(this.selectedPeriod, 10);
    return {
      page: 0,
      size: this.pageSize,
      months: Number.isFinite(months) ? months : 1,
    };
  }

  private resolveBankMonths(): number {
    if (this.isCustomPeriod && this.fromDate && this.toDate) {
      const start = new Date(this.fromDate);
      const end = new Date(this.toDate);
      const diffMonths =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
      return Math.max(1, diffMonths);
    }
    const months = parseInt(this.selectedPeriod, 10);
    return Number.isFinite(months) ? months : 3;
  }

  private mapManualPayment(payment: Payment): PaymentListItem {
    return {
      id: payment.id,
      type: 'MANUAL',
      customerName: this.extractManualCustomerName(payment),
      status: payment.status || '',
      amount: payment.paymentAmount,
      description: payment.notes || '',
      source: payment.source || 'MANUAL',
      date: payment.paymentDate,
      manualPayment: payment,
    };
  }

  private mapBankTransaction(payment: BankTransaction): PaymentListItem {
    return {
      id: payment.id,
      type: 'BANK',
      customerName: payment.customerName || '--',
      status: payment.status,
      amount: payment.amount,
      description: payment.description,
      source: payment.source || 'BANK',
      date: payment.transactionDate,
      bankTransaction: payment,
    };
  }

  private extractManualCustomerName(payment: Payment): string {
    return (
      payment.applications?.[0]?.invoice?.customer?.customerName ||
      payment.customer?.customerName ||
      '--'
    );
  }

  private sortPaymentsByDate(payments: PaymentListItem[]): PaymentListItem[] {
    return payments.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }
}
