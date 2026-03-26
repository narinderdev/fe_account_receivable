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
import { Observable, Subject, forkJoin, takeUntil } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';
import { FormsModule } from '@angular/forms';
import { ApproveBankPaymentRequest, BankTransaction, Payment } from '../../models/payment.model';
import { InvoiceWithItems } from '../../models/invoice.model';
import { CustomerEntity } from '../../models/customer.model';
import { Spinner } from '../../shared/spinner/spinner';
import { ToastrService } from 'ngx-toastr';
import { Customer as CustomerService } from '../../services/customer';

type PaymentType = 'MANUAL' | 'BANK';
type PaymentTab = 'CREATED' | 'APPROVED' | 'APPLIED';
type ModalMode = 'BANK_APPROVAL' | 'APPLY' | null;

interface PaymentListItem {
  id: number;
  type: PaymentType;
  tab: PaymentTab;
  customerName: string;
  status?: string;
  amount: number;
  description?: string;
  source?: string;
  date?: string;
  manualPayment?: Payment;
  bankTransaction?: BankTransaction;
  paymentRecord?: Payment;
}

interface InvoiceSelection {
  invoiceId: number;
  appliedAmount: number;
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
  approvedPayments: PaymentListItem[] = [];
  approvedAllPayments: PaymentListItem[] = [];
  approvedFilteredPayments: PaymentListItem[] = [];
  appliedPayments: PaymentListItem[] = [];
  appliedAllPayments: PaymentListItem[] = [];
  appliedFilteredPayments: PaymentListItem[] = [];

  // Filter properties
  selectedPeriod: string = '12';
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
  approvedCurrentPage = 0;
  approvedTotalPages = 0;
  approvedTotalItems = 0;
  approvedLoaded = false;
  appliedCurrentPage = 0;
  appliedTotalPages = 0;
  appliedTotalItems = 0;
  appliedLoaded = false;
  Math = Math;

  // BAI modal state
  isBaiModalOpen = false;
  uploadingBai = false;

  canApprovePayment = false;
  approveModalOpen = false;
  approveModalLoading = false;
  approveModalSubmitting = false;
  approveModalError: string | null = null;
  modalMode: ModalMode = null;
  approveInvoices: InvoiceWithItems[] = [];
  selectedInvoiceApplications: InvoiceSelection[] = [];
  selectedManualPayment: Payment | null = null;
  selectedBankTransaction: BankTransaction | null = null;
  approveContext: PaymentType | null = null;
  customerOptions: CustomerEntity[] = [];
  filteredCustomerOptions: CustomerEntity[] = [];
  customerOptionsLoading = false;
  customerOptionsError: string | null = null;
  selectedCustomer: CustomerEntity | null = null;
  selectedPaymentRecord: Payment | null = null;
  customerMatchMessage: string | null = null;
  activeTab: PaymentTab = 'CREATED';

  // Two-step modal properties
  customerSearchTerm: string = '';

  // Customer pagination
  customerCurrentPage = 0;
  customerPageSize = 5;
  customerTotalPages = 0;
  paginatedCustomers: CustomerEntity[] = [];

  // Invoice pagination
  invoiceCurrentPage = 0;
  invoicePageSize = 5;
  invoiceTotalPages = 0;
  paginatedInvoices: InvoiceWithItems[] = [];

  get approvePaymentAmount(): number {
    if (this.approveContext === 'BANK') {
      return this.selectedBankTransaction?.amount ?? 0;
    }
    return this.selectedManualPayment?.paymentAmount ?? 0;
  }

  get totalAppliedAmount(): number {
    return this.selectedInvoiceApplications.reduce((sum, entry) => sum + entry.appliedAmount, 0);
  }

  get remainingApproveAmount(): number {
    return Math.max(this.approvePaymentAmount - this.totalAppliedAmount, 0);
  }

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
    private customerService: CustomerService,
  ) {
    this.canApplyPayment = this.userContext.hasPermission('APPLY_PAYMENT');
    this.canApprovePayment = this.userContext.hasPermission('APPROVE_PAYMENT');
  }

  ngOnInit() {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;

      if (this.activeCompanyId === nextId) {
        return;
      }

      this.activeCompanyId = nextId;
      this.activeTab = 'CREATED';
      this.approvedLoaded = false;
      this.resetApprovedCollections();
      this.appliedLoaded = false;
      this.resetAppliedCollections();

      if (this.activeCompanyId) {
        this.loadPayments(this.activeCompanyId);
      } else {
        this.resetDraftCollections();
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setTab(tab: PaymentTab) {
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;
    this.cdr.detectChanges();
    if (tab === 'CREATED') {
      this.applySearchFilter('CREATED');
      if (this.activeCompanyId && !this.allPayments.length) {
        this.loadPayments(this.activeCompanyId);
      }
      return;
    }

    if (tab === 'APPROVED') {
      if (this.activeCompanyId) {
        if (!this.approvedLoaded) {
          this.loadApprovedPayments(this.activeCompanyId);
        } else {
          this.applySearchFilter('APPROVED');
        }
      } else {
        this.applySearchFilter('APPROVED');
      }
      return;
    }

    if (tab === 'APPLIED') {
      if (this.activeCompanyId) {
        if (!this.appliedLoaded) {
          this.loadAppliedPayments(this.activeCompanyId);
        } else {
          this.applySearchFilter('APPLIED');
        }
      } else {
        this.applySearchFilter('APPLIED');
      }
    }
  }

  loadPayments(companyId: number): void {
    const dateRange = this.buildDateRange();
    if (this.isCustomPeriod && !dateRange) {
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const manualFilters = this.buildManualFilters(dateRange);
    const bankFilters = this.buildBankFilters(dateRange);

    forkJoin({
      bank: this.paymentService.getPayments(companyId, bankFilters),
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

        this.loading = false;
        this.applySearchFilter('CREATED');
        this.updateLocalPaymentsCache();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading payments:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadApprovedPayments(companyId: number): void {
    const dateRange = this.buildDateRange();
    if (this.isCustomPeriod && !dateRange) {
      return;
    }

    const filters = this.buildManualFilters(dateRange);
    filters.statuses = ['APPROVED'];
    this.loading = true;
    this.approvedLoaded = false;
    this.cdr.detectChanges();

    this.paymentService.getFilteredPayments(companyId, filters).subscribe({
      next: (response) => {
        const pageData = response?.data;
        const content = pageData?.content ?? [];
        const approvedOnly = content.filter((entry) => entry.status?.toUpperCase() === 'APPROVED');
        const mapped = this.sortPaymentsByDate(
          approvedOnly.map((payment) => this.mapApprovedPayment(payment)),
        );
        this.approvedAllPayments = mapped;
        this.approvedFilteredPayments = [...mapped];
        this.approvedCurrentPage = 0;
        this.approvedLoaded = true;
        this.loading = false;
        this.applySearchFilter('APPROVED');
        this.updateLocalPaymentsCache();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading approved payments:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadAppliedPayments(companyId: number): void {
    const dateRange = this.buildDateRange();
    if (this.isCustomPeriod && !dateRange) {
      return;
    }

    const filters = this.buildManualFilters(dateRange);
    filters.statuses = ['APPLIED'];
    this.loading = true;
    this.appliedLoaded = false;
    this.cdr.detectChanges();

    this.paymentService.getFilteredPayments(companyId, filters).subscribe({
      next: (response) => {
        const pageData = response?.data;
        const content = pageData?.content ?? [];
        const appliedOnly = content.filter((entry) => entry.status?.toUpperCase() === 'APPLIED');
        const mapped = this.sortPaymentsByDate(
          appliedOnly.map((payment) => this.mapApprovedPayment(payment, 'APPLIED')),
        );
        this.appliedAllPayments = mapped;
        this.appliedFilteredPayments = [...mapped];
        this.appliedCurrentPage = 0;
        this.appliedLoaded = true;
        this.loading = false;
        this.applySearchFilter('APPLIED');
        this.updateLocalPaymentsCache();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading applied payments:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearchChange(): void {
    this.applySearchFilter();
  }

  onPeriodChange(): void {
    if (this.selectedPeriod === 'custom') {
      this.isCustomPeriod = true;
    } else {
      this.isCustomPeriod = false;
      this.fromDate = null;
      this.toDate = null;
      this.reloadWithFilters();
    }
  }

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

  // ─── BAI Modal ────────────────────────────────────────────────────────────

  openBaiModal() {
    if (!this.canApplyPayment) {
      this.toastr.warning('You do not have permission to upload BAI files.', 'Permission Denied');
      return;
    }
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

    if (!this.canApplyPayment) {
      this.toastr.warning('You do not have permission to upload BAI files.', 'Permission Denied');
      input.value = '';
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

  // ─── EOB Modal ────────────────────────────────────────────────────────────

  // ─── Shared ───────────────────────────────────────────────────────────────

  private reloadWithFilters() {
    if (!this.activeCompanyId) {
      return;
    }
    this.currentPage = 0;
    this.approvedCurrentPage = 0;
     this.appliedCurrentPage = 0;

    if (this.activeTab === 'APPROVED') {
      this.approvedLoaded = false;
      this.loadApprovedPayments(this.activeCompanyId);
      return;
    }

    if (this.activeTab === 'APPLIED') {
      this.appliedLoaded = false;
      this.loadAppliedPayments(this.activeCompanyId);
      return;
    }

    this.approvedLoaded = false;
    this.appliedLoaded = false;
    this.resetApprovedCollections();
    this.resetAppliedCollections();
    this.loadPayments(this.activeCompanyId);
  }

  private applySearchFilter(targetTab: PaymentTab = this.activeTab) {
    const term = this.searchName.trim().toLowerCase();

    if (targetTab === 'APPROVED') {
      if (term.length < 3) {
        this.approvedFilteredPayments = [...this.approvedAllPayments];
      } else {
        this.approvedFilteredPayments = this.approvedAllPayments.filter((payment) => {
          const customerName = payment.customerName?.toLowerCase() || '';
          return customerName.includes(term);
        });
      }
      this.approvedCurrentPage = 0;
      this.updatePagination('APPROVED');
      return;
    }

    if (targetTab === 'APPLIED') {
      if (term.length < 3) {
        this.appliedFilteredPayments = [...this.appliedAllPayments];
      } else {
        this.appliedFilteredPayments = this.appliedAllPayments.filter((payment) => {
          const customerName = payment.customerName?.toLowerCase() || '';
          return customerName.includes(term);
        });
      }
      this.appliedCurrentPage = 0;
      this.updatePagination('APPLIED');
      return;
    }

    if (term.length < 3) {
      this.filteredPayments = [...this.allPayments];
    } else {
      this.filteredPayments = this.allPayments.filter((payment) => {
        const customerName = payment.customerName?.toLowerCase() || '';
        return customerName.includes(term);
      });
    }

    this.currentPage = 0;
    this.updatePagination('CREATED');
  }

  private updatePagination(targetTab: PaymentTab = this.activeTab) {
    if (targetTab === 'APPROVED') {
      this.approvedTotalItems = this.approvedFilteredPayments.length;
      this.approvedTotalPages =
        this.approvedTotalItems === 0 ? 0 : Math.ceil(this.approvedTotalItems / this.pageSize);

      if (this.approvedTotalPages === 0) {
        this.approvedCurrentPage = 0;
      } else if (this.approvedCurrentPage >= this.approvedTotalPages) {
        this.approvedCurrentPage = this.approvedTotalPages - 1;
      }

      this.updatePagedPayments('APPROVED');
      return;
    }

    if (targetTab === 'APPLIED') {
      this.appliedTotalItems = this.appliedFilteredPayments.length;
      this.appliedTotalPages =
        this.appliedTotalItems === 0 ? 0 : Math.ceil(this.appliedTotalItems / this.pageSize);

      if (this.appliedTotalPages === 0) {
        this.appliedCurrentPage = 0;
      } else if (this.appliedCurrentPage >= this.appliedTotalPages) {
        this.appliedCurrentPage = this.appliedTotalPages - 1;
      }

      this.updatePagedPayments('APPLIED');
      return;
    }

    this.totalItems = this.filteredPayments.length;
    this.totalPages = this.totalItems === 0 ? 0 : Math.ceil(this.totalItems / this.pageSize);

    if (this.totalPages === 0) {
      this.currentPage = 0;
    } else if (this.currentPage >= this.totalPages) {
      this.currentPage = this.totalPages - 1;
    }

    this.updatePagedPayments('CREATED');
  }

  private updatePagedPayments(targetTab: PaymentTab = this.activeTab) {
    if (targetTab === 'APPROVED') {
      const start = this.approvedCurrentPage * this.pageSize;
      const end = start + this.pageSize;
      this.approvedPayments = this.approvedFilteredPayments.slice(start, end);
      return;
    }

    if (targetTab === 'APPLIED') {
      const start = this.appliedCurrentPage * this.pageSize;
      const end = start + this.pageSize;
      this.appliedPayments = this.appliedFilteredPayments.slice(start, end);
      return;
    }

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
      CREATED: 'status-partial',
      APPROVED: 'status-paid',
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

  getCustomerInitialFromName(name?: string | null): string {
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

  openPaymentDetails(paymentId: number, paymentType: 'MANUAL' | 'BANK') {
    this.router.navigate(['/admin/payments/details', paymentType, paymentId]);
  }

  approveOnly(payment: PaymentListItem, event: Event) {
    event.stopPropagation();

    if (payment.type === 'MANUAL' && payment.manualPayment) {
      this.approveManualPaymentOnly(payment.manualPayment);
      return;
    }

    if (payment.type === 'BANK' && payment.bankTransaction) {
      this.openBankApproveModal(payment.bankTransaction);
      return;
    }

    this.toastr.warning('Unable to approve this payment type.', 'Unsupported Action');
  }

  formatToTitleCase(value?: string | null): string {
    if (!value) {
      return '--';
    }

    return value
      .toLowerCase()
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private approveManualPaymentOnly(manualPayment: Payment) {
    const paymentId = manualPayment.paymentId ?? manualPayment.id;
    if (!paymentId) {
      this.toastr.error('Unable to identify this payment.', 'Missing Payment ID');
      return;
    }

    this.paymentService
      .approvePayment(paymentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const backendMessage = response?.message || 'Payment approved successfully.';
          this.toastr.success(backendMessage, 'Success');
          if (this.activeCompanyId) {
            this.loadPayments(this.activeCompanyId);
            this.approvedLoaded = false;
            this.resetApprovedCollections();
          }
        },
        error: (error) => {
          const message = this.getApproveBankErrorMessage(error);
          this.toastr.error(message, 'Error');
        },
      });
  }

  private openBankApproveModal(bankTransaction: BankTransaction) {
    if (!bankTransaction.id) {
      this.toastr.error('Unable to identify this bank transaction.', 'Missing Transaction ID');
      return;
    }

    if (!this.activeCompanyId) {
      this.toastr.warning('Please select an AR company first.', 'Company Required');
      return;
    }

    this.approveContext = 'BANK';
    this.selectedBankTransaction = bankTransaction;
    this.selectedManualPayment = null;
    this.selectedPaymentRecord = null;
    this.selectedCustomer = null;
    this.selectedInvoiceApplications = [];
    this.approveInvoices = [];
    this.approveModalError = null;
    this.customerOptionsError = null;
    this.customerMatchMessage = null;
    this.modalMode = 'BANK_APPROVAL';
    this.approveModalOpen = true;
    this.approveModalSubmitting = false;
    this.approveModalLoading = false;
    this.customerOptionsLoading = true;
    this.customerSearchTerm = '';
    this.customerCurrentPage = 0;
    this.invoiceCurrentPage = 0;
    this.cdr.detectChanges();

    this.customerService
      .getCustomers(this.activeCompanyId, 0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const customers = response?.data?.content ?? [];
          this.customerOptions = customers;
          if (!customers.length) {
            this.filteredCustomerOptions = [];
            this.customerMatchMessage = 'No customers available for this company.';
            this.customerOptionsLoading = false;
            this.updateCustomerPagination();
            this.cdr.detectChanges();
            return;
          }
          this.filteredCustomerOptions = this.filterCustomersByName(
            bankTransaction.customerName,
            customers,
          );
          this.customerOptionsLoading = false;
          this.updateCustomerPagination();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.customerOptions = [];
          this.filteredCustomerOptions = [];
          this.selectedCustomer = null;
          this.customerOptionsError = error?.error?.message || 'Unable to load customers.';
          this.customerMatchMessage = null;
          this.customerOptionsLoading = false;
          this.updateCustomerPagination();
          this.toastr.error(this.customerOptionsError ?? 'Unable to load customers.', 'Error');
          this.cdr.detectChanges();
        },
      });
  }

  private loadInvoicesForApproval(customerId: number) {
    if (!customerId) {
      this.approveInvoices = [];
      this.approveModalLoading = false;
      this.approveModalError = 'No customer selected for loading invoices.';
      this.updateInvoicePagination();
      return;
    }

    this.approveInvoices = [];
    this.approveModalError = null;
    this.approveModalLoading = true;

    this.customerService
      .getCustomerInvoicesById(customerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.approveInvoices = response?.data ?? [];
          this.approveModalLoading = false;
          this.invoiceCurrentPage = 0;
          this.updateInvoicePagination();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.approveInvoices = [];
          this.approveModalLoading = false;
          this.approveModalError =
            error?.error?.message || 'Unable to load invoices for this customer.';
          this.toastr.error(
            this.approveModalError ?? 'Unable to load invoices for this customer.',
            'Error',
          );
          this.updateInvoicePagination();
          this.cdr.detectChanges();
        },
      });
  }

  private filterCustomersByName(
    name: string | undefined,
    customers: CustomerEntity[],
  ): CustomerEntity[] {
    const normalizedTarget = this.normalizeName(name);
    if (!normalizedTarget) {
      this.customerMatchMessage = null;
      return customers;
    }

    const matches = customers.filter((customer) =>
      this.normalizeName(customer.customerName).includes(normalizedTarget),
    );

    if (matches.length) {
      this.customerMatchMessage = null;
      return matches;
    }

    this.customerMatchMessage = `No exact customer matches for "${name}". Showing all customers.`;
    return customers;
  }

  private normalizeName(value?: string | null): string {
    return value?.toLowerCase().replace(/[\s-_]+/g, '') ?? '';
  }

  selectBankCustomer(customer: CustomerEntity) {
    if (!customer || this.selectedCustomer?.id === customer.id) {
      return;
    }

    this.selectedCustomer = customer;
    this.cdr.detectChanges();
  }

  onCustomerSearch() {
    const term = this.customerSearchTerm.trim().toLowerCase();

    if (!term) {
      this.filteredCustomerOptions = [...this.customerOptions];
    } else {
      this.filteredCustomerOptions = this.customerOptions.filter((customer) => {
        const name = customer.customerName?.toLowerCase() || '';
        const email = customer.email?.toLowerCase() || '';
        return name.includes(term) || email.includes(term);
      });
    }

    this.customerCurrentPage = 0;
    this.updateCustomerPagination();
    this.cdr.detectChanges();
  }

  updateCustomerPagination() {
    this.customerTotalPages = Math.max(
      1,
      Math.ceil(this.filteredCustomerOptions.length / this.customerPageSize),
    );

    if (this.customerCurrentPage >= this.customerTotalPages) {
      this.customerCurrentPage = Math.max(0, this.customerTotalPages - 1);
    }

    const start = this.customerCurrentPage * this.customerPageSize;
    const end = start + this.customerPageSize;
    this.paginatedCustomers = this.filteredCustomerOptions.slice(start, end);
  }

  updateInvoicePagination() {
    this.invoiceTotalPages = Math.max(
      1,
      Math.ceil(this.approveInvoices.length / this.invoicePageSize),
    );

    if (this.invoiceCurrentPage >= this.invoiceTotalPages) {
      this.invoiceCurrentPage = Math.max(0, this.invoiceTotalPages - 1);
    }

    const start = this.invoiceCurrentPage * this.invoicePageSize;
    const end = start + this.invoicePageSize;
    this.paginatedInvoices = this.approveInvoices.slice(start, end);
  }

  nextCustomerPage() {
    if (this.customerCurrentPage < this.customerTotalPages - 1) {
      this.customerCurrentPage++;
      this.updateCustomerPagination();
      this.cdr.detectChanges();
    }
  }

  prevCustomerPage() {
    if (this.customerCurrentPage > 0) {
      this.customerCurrentPage--;
      this.updateCustomerPagination();
      this.cdr.detectChanges();
    }
  }

  nextInvoicePage() {
    if (this.invoiceCurrentPage < this.invoiceTotalPages - 1) {
      this.invoiceCurrentPage++;
      this.updateInvoicePagination();
      this.cdr.detectChanges();
    }
  }

  prevInvoicePage() {
    if (this.invoiceCurrentPage > 0) {
      this.invoiceCurrentPage--;
      this.updateInvoicePagination();
      this.cdr.detectChanges();
    }
  }

  closeApproveModal() {
    if (this.approveModalSubmitting) {
      return;
    }
    this.resetApproveModalState();
    this.cdr.detectChanges();
  }

  private resetApproveModalState() {
    this.approveModalOpen = false;
    this.approveModalLoading = false;
    this.approveModalSubmitting = false;
    this.approveModalError = null;
    this.approveInvoices = [];
    this.selectedInvoiceApplications = [];
    this.selectedManualPayment = null;
    this.selectedBankTransaction = null;
    this.selectedPaymentRecord = null;
    this.approveContext = null;
    this.customerOptions = [];
    this.filteredCustomerOptions = [];
    this.customerOptionsError = null;
    this.customerOptionsLoading = false;
    this.selectedCustomer = null;
    this.customerMatchMessage = null;
    this.modalMode = null;
    this.customerSearchTerm = '';
    this.customerCurrentPage = 0;
    this.invoiceCurrentPage = 0;
    this.paginatedCustomers = [];
    this.paginatedInvoices = [];
  }

  toggleInvoiceSelection(invoice: InvoiceWithItems) {
    if (!invoice) {
      return;
    }
    if (this.approveContext === 'BANK' && !this.selectedCustomer) {
      this.toastr.warning('Select a customer before choosing invoices.', 'Customer Required');
      return;
    }
    const invoiceId = invoice.id;
    if (this.isInvoiceSelected(invoiceId)) {
      this.selectedInvoiceApplications = this.selectedInvoiceApplications.filter(
        (entry) => entry.invoiceId !== invoiceId,
      );
      return;
    }

    if (this.remainingApproveAmount <= 0) {
      this.toastr.warning('Payment amount has already been fully allocated.', 'No Amount Left');
      return;
    }

    const invoiceBalance = this.getInvoiceBalance(invoice);
    const appliedAmount = Math.min(invoiceBalance, this.remainingApproveAmount);
    if (appliedAmount <= 0) {
      this.toastr.warning('Unable to apply any amount to this invoice.', 'No Amount Left');
      return;
    }

    this.selectedInvoiceApplications = [
      ...this.selectedInvoiceApplications,
      { invoiceId, appliedAmount },
    ];
  }

  isInvoiceSelected(invoiceId: number): boolean {
    return this.selectedInvoiceApplications.some((entry) => entry.invoiceId === invoiceId);
  }

  getInvoiceAppliedAmount(invoiceId: number): number {
    return (
      this.selectedInvoiceApplications.find((entry) => entry.invoiceId === invoiceId)
        ?.appliedAmount || 0
    );
  }

  openApplyModal(payment: PaymentListItem, event: Event) {
    event.stopPropagation();

    const paymentRecord = payment.paymentRecord ?? payment.manualPayment ?? null;
    if (!paymentRecord) {
      this.toastr.error('Unable to open this payment.', 'Payment Not Found');
      return;
    }

    const customerId = this.resolveCustomerIdFromPayment(paymentRecord);
    if (!customerId) {
      this.toastr.error('Unable to determine the customer for this payment.', 'Customer Required');
      return;
    }

    this.approveContext = payment.type;
    this.modalMode = 'APPLY';
    this.selectedPaymentRecord = paymentRecord;
    this.selectedManualPayment = paymentRecord;
    this.selectedBankTransaction = payment.bankTransaction ?? paymentRecord.bankTransaction ?? null;
    this.selectedInvoiceApplications = [];
    this.approveInvoices = [];
    this.approveModalError = null;
    this.approveModalOpen = true;
    this.approveModalSubmitting = false;
    this.approveModalLoading = true;
    this.invoiceCurrentPage = 0;
    this.approveModalLoading = true;
    this.cdr.detectChanges();

    if (paymentRecord.customer && paymentRecord.customer.id === customerId) {
      this.selectedCustomer = paymentRecord.customer;
    } else {
      this.customerService
        .getCustomerById(customerId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.selectedCustomer = response?.data || null;
            this.cdr.detectChanges();
          },
          error: () => {
            this.selectedCustomer = null;
            this.toastr.warning('Unable to load customer details for this payment.', 'Warning');
            this.cdr.detectChanges();
          },
        });
    }

    this.loadInvoicesForApproval(customerId);
  }

  submitApplyInvoices() {
    if (!this.selectedPaymentRecord) {
      this.toastr.error('Unable to identify the selected payment.', 'Error');
      return;
    }

    if (this.selectedInvoiceApplications.length === 0) {
      this.toastr.warning('Select at least one invoice to apply this payment.', 'Invoices Required');
      return;
    }

    const paymentId = this.resolvePaymentId(this.selectedPaymentRecord);
    if (!paymentId) {
      this.toastr.error('Unable to determine the payment identifier.', 'Error');
      return;
    }

    const payload = {
      invoiceIds: this.selectedInvoiceApplications.map((entry) => entry.invoiceId),
    };

    this.approveModalSubmitting = true;
    this.paymentService
      .applyApprovedPayment(paymentId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const backendMessage = response?.message || 'Payment applied successfully.';
          this.toastr.success(backendMessage, 'Success');
          this.approveModalSubmitting = false;
          this.resetApproveModalState();
          if (this.activeCompanyId) {
            this.approvedLoaded = false;
            this.loadApprovedPayments(this.activeCompanyId);
            this.appliedLoaded = false;
            this.resetAppliedCollections();
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          const message = error?.error?.message || 'Failed to apply payment.';
          this.toastr.error(message, 'Error');
          this.approveModalSubmitting = false;
          this.cdr.detectChanges();
        },
      });
  }

  submitBankApproval() {
    if (!this.selectedBankTransaction?.id) {
      this.toastr.error('Unable to identify this bank transaction.', 'Error');
      return;
    }

    if (!this.activeCompanyId) {
      this.toastr.warning('Please select an AR company first.', 'Company Required');
      return;
    }

    this.approveModalSubmitting = true;
    let approval$: Observable<any>;

    if (this.selectedCustomer?.id) {
      const payload: ApproveBankPaymentRequest = { customerId: this.selectedCustomer.id };
      approval$ = this.paymentService.approveBankTransaction(this.selectedBankTransaction.id, payload);
    } else {
      approval$ = this.paymentService.approveBankTransactionWithEra(
        this.activeCompanyId,
        this.selectedBankTransaction.id,
      );
    }

    approval$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const backendMessage = response?.message || 'Payment approved successfully.';
          this.toastr.success(backendMessage, 'Success');
          this.approveModalSubmitting = false;
          this.resetApproveModalState();
          if (this.activeCompanyId) {
            this.loadPayments(this.activeCompanyId);
            this.approvedLoaded = false;
            this.resetApprovedCollections();
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          const message = this.getApproveBankErrorMessage(error);
          this.toastr.error(message, 'Error');
          this.approveModalSubmitting = false;
          this.cdr.detectChanges();
        },
      });
  }

  private resolvePaymentId(payment: Payment | null): number | null {
    if (!payment) {
      return null;
    }
    return payment.paymentId ?? payment.id ?? null;
  }

  private resolveCustomerIdFromPayment(payment: Payment | null): number | null {
    if (!payment) {
      return null;
    }

    return (
      payment.customerId ??
      payment.customer?.id ??
      payment.customer?.customerId ??
      payment.applications?.[0]?.invoice?.customer?.id ??
      payment.applications?.[0]?.invoice?.customer?.customerId ??
      null
    );
  }

  private getApproveBankErrorMessage(error: unknown): string {
    const httpError = error as { status?: number; error?: { message?: string } };
    if (httpError?.status === 500) {
      return 'No matching payment found in the uploaded ERA/EOB file for the selected BAI transaction.';
    }
    return httpError?.error?.message || 'Failed to approve payment.';
  }

  trackInvoiceById(_index: number, invoice: InvoiceWithItems): number {
    return invoice.id;
  }

  private getInvoiceBalance(invoice: InvoiceWithItems): number {
    return Number(invoice.balanceDue ?? invoice.totalAmount ?? 0);
  }

  getPageNumbers(tab: PaymentTab = this.activeTab): number[] {
    const pages: number[] = [];
    const current =
      tab === 'APPROVED'
        ? this.approvedCurrentPage + 1
        : tab === 'APPLIED'
          ? this.appliedCurrentPage + 1
          : this.currentPage + 1;
    const total =
      tab === 'APPROVED'
        ? this.approvedTotalPages
        : tab === 'APPLIED'
          ? this.appliedTotalPages
          : this.totalPages;

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

  goToPage(page: number, tab: PaymentTab = this.activeTab) {
    if (tab === 'APPROVED') {
      if (page >= 0 && page < this.approvedTotalPages && page !== this.approvedCurrentPage) {
        this.approvedCurrentPage = page;
        this.updatePagedPayments('APPROVED');
      }
      return;
    }

    if (tab === 'APPLIED') {
      if (page >= 0 && page < this.appliedTotalPages && page !== this.appliedCurrentPage) {
        this.appliedCurrentPage = page;
        this.updatePagedPayments('APPLIED');
      }
      return;
    }

    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagedPayments('CREATED');
    }
  }

  nextPage(tab: PaymentTab = this.activeTab) {
    if (tab === 'APPROVED') {
      if (this.approvedCurrentPage < this.approvedTotalPages - 1) {
        this.approvedCurrentPage += 1;
        this.updatePagedPayments('APPROVED');
      }
      return;
    }

    if (tab === 'APPLIED') {
      if (this.appliedCurrentPage < this.appliedTotalPages - 1) {
        this.appliedCurrentPage += 1;
        this.updatePagedPayments('APPLIED');
      }
      return;
    }

    if (this.currentPage < this.totalPages - 1) {
      this.currentPage += 1;
      this.updatePagedPayments('CREATED');
    }
  }

  prevPage(tab: PaymentTab = this.activeTab) {
    if (tab === 'APPROVED') {
      if (this.approvedCurrentPage > 0) {
        this.approvedCurrentPage -= 1;
        this.updatePagedPayments('APPROVED');
      }
      return;
    }

    if (tab === 'APPLIED') {
      if (this.appliedCurrentPage > 0) {
        this.appliedCurrentPage -= 1;
        this.updatePagedPayments('APPLIED');
      }
      return;
    }

    if (this.currentPage > 0) {
      this.currentPage -= 1;
      this.updatePagedPayments('CREATED');
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

  private buildManualFilters(dateRange: { fromDate: string; toDate: string } | null): {
    page: number;
    size: number;
    months?: number;
    fromDate?: string;
    toDate?: string;
    statuses?: string[];
  } {
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
    const months = parseInt(this.selectedPeriod, 10);
    return Number.isFinite(months) ? months : 3;
  }

  private buildBankFilters(dateRange: { fromDate: string; toDate: string } | null): {
    months?: number;
    fromDate?: string;
    toDate?: string;
  } {
    if (this.isCustomPeriod) {
      if (!dateRange) {
        throw new Error('Custom date range is required for bank payment filtering.');
      }
      return {
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      };
    }

    return {
      months: this.resolveBankMonths(),
    };
  }

  private mapManualPayment(payment: Payment): PaymentListItem {
    const manualId = payment.id ?? payment.paymentId ?? payment.customerId ?? 0;
    return {
      id: manualId,
      type: 'MANUAL',
      tab: 'CREATED',
      customerName: this.extractManualCustomerName(payment),
      status: payment.status || '',
      amount: payment.paymentAmount ?? 0,
      description: payment.notes || '',
      source: payment.source || 'MANUAL',
      date: payment.paymentDate,
      manualPayment: payment,
      paymentRecord: payment,
    };
  }

  private mapApprovedPayment(payment: Payment, tab: PaymentTab = 'APPROVED'): PaymentListItem {
    const isBank = payment.source?.toUpperCase() === 'BANK' || Boolean(payment.bankTransaction);
    const type: PaymentType = isBank ? 'BANK' : 'MANUAL';
    const id =
      payment.id ?? payment.paymentId ?? payment.bankTransaction?.id ?? payment.customerId ?? 0;
    const customerName = isBank
      ? payment.bankTransaction?.customerName || payment.customerName || '--'
      : this.extractManualCustomerName(payment);

    return {
      id,
      type,
      tab,
      customerName,
      status: payment.status || '',
      amount: payment.paymentAmount ?? payment.bankTransaction?.amount ?? 0,
      description: payment.notes || payment.bankTransaction?.description || '',
      source: payment.source || (isBank ? 'BANK' : 'MANUAL'),
      date: payment.paymentDate || payment.bankTransaction?.transactionDate,
      manualPayment: type === 'MANUAL' ? payment : undefined,
      bankTransaction: type === 'BANK' ? (payment.bankTransaction ?? undefined) : undefined,
      paymentRecord: payment,
    };
  }

  private mapBankTransaction(payment: BankTransaction): PaymentListItem {
    return {
      id: payment.id,
      type: 'BANK',
      tab: 'CREATED',
      customerName: payment.customerName || '--',
      status: payment.status,
      amount: payment.amount,
      description: payment.description,
      source: payment.source || 'BANK',
      date: payment.transactionDate,
      bankTransaction: payment,
      paymentRecord: undefined,
    };
  }

  private extractManualCustomerName(payment: Payment): string {
    const directName = payment.customerName?.trim();
    if (directName) {
      return directName;
    }

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

  private resetDraftCollections() {
    this.payments = [];
    this.allPayments = [];
    this.filteredPayments = [];
    this.totalPages = 0;
    this.currentPage = 0;
    this.totalItems = 0;
  }

  private resetApprovedCollections() {
    this.approvedPayments = [];
    this.approvedAllPayments = [];
    this.approvedFilteredPayments = [];
    this.approvedCurrentPage = 0;
    this.approvedTotalPages = 0;
    this.approvedTotalItems = 0;
  }

  private resetAppliedCollections() {
    this.appliedPayments = [];
    this.appliedAllPayments = [];
    this.appliedFilteredPayments = [];
    this.appliedCurrentPage = 0;
    this.appliedTotalPages = 0;
    this.appliedTotalItems = 0;
  }

  private updateLocalPaymentsCache() {
    const combined = this.sortPaymentsByDate([
      ...this.allPayments,
      ...this.approvedAllPayments,
      ...this.appliedAllPayments,
    ]);
    localStorage.setItem('paymentsData', JSON.stringify(combined));
  }
}
