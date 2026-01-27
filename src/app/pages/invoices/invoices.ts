import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { InvoiceService } from '../../services/invoice-service';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import { Invoice, InvoicePage } from '../../models/invoice.model';
import { CompanySelectionService } from '../../services/company-selection.service';
import { UserContextService } from '../../services/user-context.service';

interface InvoiceState {
  invoices: Invoice[];
  allInvoices: Invoice[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [RouterLink, CommonModule, Loader, Spinner, FormsModule],
  templateUrl: './invoices.html',
  styleUrl: './invoices.css',
})
export class Invoices implements OnInit, OnDestroy {
  searchName: string = '';
  Math = Math;
  selectedPeriod: string = '12';
  isCustomPeriod = false;
  fromDate: string | null = null;
  toDate: string | null = null;

  state: InvoiceState = this.buildInitialState();

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;

  canCreateInvoice = false;
  canApproveInvoice = false;

  approvingInvoiceId: number | null = null;
  approveModalOpen = false;
  invoiceToApprove: Invoice | null = null;

  periodOptions = [
    { value: '1', label: 'Last 1 Month' },
    { value: '2', label: 'Last 2 Months' },
    { value: '6', label: 'Last 6 Months' },
    { value: '12', label: 'Last 12 Months' },
    { value: 'custom', label: 'Custom Date Range' },
  ];

  constructor(
    private invoiceService: InvoiceService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private companySelection: CompanySelectionService,
    private userContext: UserContextService,
    private toastr: ToastrService,
  ) {
    this.canCreateInvoice = this.userContext.hasPermission('CREATE_INVOICE');
    this.canApproveInvoice = this.userContext.hasPermission('APPROVE_INVOICE');
  }

  ngOnInit() {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;

      if (this.activeCompanyId === nextId) return;

      this.activeCompanyId = nextId;

      if (!this.activeCompanyId) {
        this.state = this.buildInitialState('Select a company to view invoices.');
        this.cdr.detectChanges();
        return;
      }

      this.loadInvoices(this.activeCompanyId, 0);
    });
  }

  private buildInitialState(errorMessage: string | null = null): InvoiceState {
    return {
      invoices: [],
      allInvoices: [],
      loading: false,
      error: errorMessage,
      currentPage: 0,
      totalPages: 0,
      totalItems: 0,
      pageSize: 10,
    };
  }

  loadInvoices(companyId: number, page: number = 0): void {
    const pageSize = this.state.pageSize || 10;

    this.state = { ...this.state, loading: true, error: null };
    this.cdr.detectChanges();

    const params: {
      page: number;
      size: number;
      months?: number;
      fromDate?: string;
      toDate?: string;
    } = { page, size: pageSize };

    if (this.isCustomPeriod) {
      if (this.fromDate) params.fromDate = this.fromDate;
      if (this.toDate) params.toDate = this.toDate;
    } else {
      params.months = parseInt(this.selectedPeriod, 10);
    }

    this.invoiceService.getInvoices(companyId, params).subscribe({
      next: (res: InvoicePage) => {
        const pageData = res?.data;
        const content = pageData?.content || [];

        this.state = {
          ...this.state,
          invoices: content,
          allInvoices: [...content],
          loading: false,
          error: null,
          currentPage: pageData?.number ?? page,
          totalPages: pageData?.totalPages ?? 0,
          totalItems: pageData?.totalElements ?? content.length,
          pageSize: pageData?.size ?? pageSize,
        };

        this.applySearchFilter();
        this.cdr.detectChanges();
      },
      error: (err) => {
        const message = err?.error?.message || 'Unable to load invoices.';
        this.state = {
          ...this.state,
          invoices: [],
          allInvoices: [],
          loading: false,
          error: message,
          currentPage: 0,
          totalPages: 0,
          totalItems: 0,
        };
        this.cdr.detectChanges();
      },
    });
  }

  // Show approve only for draft invoices
  isDraft(inv: Invoice): boolean {
    return (inv as any)?.status === 'DRAFT';
  }

  openApproveModal(invoice: Invoice, event: Event): void {
    event.stopPropagation();
    this.invoiceToApprove = invoice;
    this.approveModalOpen = true;
    this.cdr.detectChanges();
  }

  closeApproveModal(): void {
    if (this.approvingInvoiceId) return;
    this.approveModalOpen = false;
    this.invoiceToApprove = null;
    this.cdr.detectChanges();
  }

  confirmApproveInvoice(): void {
    if (!this.invoiceToApprove || this.approvingInvoiceId) return;

    const invoiceId = this.invoiceToApprove.id;
    const invoiceNumber = this.invoiceToApprove.invoiceNumber;

    this.approvingInvoiceId = invoiceId;
    this.cdr.detectChanges();

    this.invoiceService.approveInvoice(invoiceId).subscribe({
      next: () => {
        const companyId = this.activeCompanyId;
        if (!companyId) {
          this.approvingInvoiceId = null;
          this.toastr.error('Select a company before sending the invoice.', 'Missing Company');
          this.cdr.detectChanges();
          return;
        }

        this.invoiceService.sendInvoice(invoiceId, companyId).subscribe({
          next: () => {
            this.approvingInvoiceId = null;
            this.closeApproveModal();

            this.toastr.success(
              `Invoice ${invoiceNumber} has been approved and sent successfully.`,
              'Success',
            );

            if (this.activeCompanyId)
              this.loadInvoices(this.activeCompanyId, this.state.currentPage);
            this.cdr.detectChanges();
          },
          error: (sendErr) => {
            const message = sendErr?.error?.message || 'Failed to send invoice.';
            this.approvingInvoiceId = null;
            this.closeApproveModal();

            this.toastr.warning(
              `Invoice ${invoiceNumber} was approved but could not be sent: ${message}`,
              'Partial Success',
              { timeOut: 5000 },
            );

            if (this.activeCompanyId)
              this.loadInvoices(this.activeCompanyId, this.state.currentPage);
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        const message = err?.error?.message || 'Unable to approve invoice.';
        this.approvingInvoiceId = null;
        this.toastr.error(message, 'Approval Failed');
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
      return;
    }
    this.isCustomPeriod = false;
    this.fromDate = null;
    this.toDate = null;
    this.reloadWithFilters();
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

  private applySearchFilter() {
    const term = this.searchName.trim().toLowerCase();

    if (term.length < 3) {
      this.state = { ...this.state, invoices: [...this.state.allInvoices] };
      return;
    }

    const filtered = this.state.allInvoices.filter((inv) =>
      inv.customer?.customerName?.toLowerCase().includes(term),
    );

    this.state = { ...this.state, invoices: filtered };
  }

  private reloadWithFilters() {
    if (!this.activeCompanyId) {
      return;
    }
    this.loadInvoices(this.activeCompanyId, 0);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.state.totalPages;

    if (total <= 0) return pages;

    const current = this.state.currentPage + 1;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);

      if (current <= 3) pages.push(2, 3, 4, -1, total);
      else if (current >= total - 2) pages.push(-1, total - 3, total - 2, total - 1, total);
      else pages.push(-1, current - 1, current, current + 1, -1, total);
    }

    return pages;
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

    // Use modulo to cycle through colors
    const colorIndex = index % palette.length;
    return palette[colorIndex];
  }

  getCustomerInitial(name?: string | null): string {
    const trimmed = name?.trim();
    if (!trimmed) {
      return '?';
    }
    return trimmed.charAt(0).toUpperCase();
  }

  formatCustomerName(name?: string | null): string {
    if (!name) return '—';
    const trimmed = name.trim();
    if (!trimmed) return '—';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  formatStatus(status?: string | null): string {
    if (!status) return 'Unknown';
    return status
      .toLowerCase()
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  getStatusClass(status?: string | null): string {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'draft':
        return 'status-draft';
      case 'sent':
      case 'approved':
        return 'status-sent';
      case 'paid':
        return 'status-paid';
      case 'overdue':
      case 'past_due':
        return 'status-overdue';
      default:
        return 'status-unknown';
    }
  }

  goToPage(page: number): void {
    if (!this.activeCompanyId) return;
    if (page < 0 || page >= this.state.totalPages || page === this.state.currentPage) return;
    this.loadInvoices(this.activeCompanyId, page);
  }

  nextPage() {
    if (!this.activeCompanyId) return;
    if (this.state.currentPage < this.state.totalPages - 1) {
      this.loadInvoices(this.activeCompanyId, this.state.currentPage + 1);
    }
  }

  prevPage() {
    if (!this.activeCompanyId) return;
    if (this.state.currentPage > 0) {
      this.loadInvoices(this.activeCompanyId, this.state.currentPage - 1);
    }
  }

  formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US');
  }

  openInvoice(invoiceId: number) {
    this.router.navigate(['/admin/invoices/detail', invoiceId]);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
