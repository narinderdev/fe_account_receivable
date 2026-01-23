import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice-service';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { Invoice, InvoicePage } from '../../models/invoice.model';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';

type InvoiceTab = 'APPROVED' | 'DRAFT';

interface InvoiceTabState {
  invoices: Invoice[];
  allInvoices: Invoice[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
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

  // Tab management
  activeTab: InvoiceTab = 'APPROVED';
  tabStates: Record<InvoiceTab, InvoiceTabState> = this.createInitialTabStates();

  // Month filter properties (only for APPROVED tab)
  selectedPeriod: string = '12'; // Default to 12 months
  isCustomPeriod: boolean = false;
  fromDate: string | null = null;
  toDate: string | null = null;

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  private readonly defaultPageSize = 10;
  canCreateInvoice = false;
  approvingInvoiceId: number | null = null;
  approveModalOpen = false;
  invoiceToApprove: Invoice | null = null;

  // Period options for dropdown
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
        this.activeTab = 'APPROVED';
        this.resetTabStates();
        this.loadInvoices(this.activeCompanyId, 'APPROVED');
        this.loadInvoices(this.activeCompanyId, 'DRAFT');
      } else {
        this.activeTab = 'APPROVED';
        this.resetTabStates('Select a company to view invoices.');
        this.cdr.detectChanges();
      }
    });
  }

  private createInitialTabStates(
    errorMessage: string | null = null,
  ): Record<InvoiceTab, InvoiceTabState> {
    return {
      APPROVED: this.buildInitialTabState(errorMessage),
      DRAFT: this.buildInitialTabState(errorMessage),
    };
  }

  private buildInitialTabState(errorMessage: string | null): InvoiceTabState {
    return {
      invoices: [],
      allInvoices: [],
      loading: false,
      error: errorMessage,
      initialized: false,
      currentPage: 0,
      totalPages: 0,
      totalItems: 0,
      pageSize: this.defaultPageSize,
    };
  }

  private resetTabStates(errorMessage: string | null = null) {
    this.tabStates = this.createInitialTabStates(errorMessage);
  }

  private setTabState(tab: InvoiceTab, patch: Partial<InvoiceTabState>) {
    this.tabStates = {
      ...this.tabStates,
      [tab]: {
        ...this.tabStates[tab],
        ...patch,
      },
    };
  }

  get activeTabState(): InvoiceTabState {
    return this.tabStates[this.activeTab];
  }

  setTab(tab: InvoiceTab) {
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;
    this.cdr.detectChanges();
    if (!this.tabStates[tab].initialized && this.activeCompanyId) {
      this.loadInvoices(this.activeCompanyId, tab);
    }
  }

  loadInvoices(companyId: number, tab: InvoiceTab, page?: number): void {
    const currentState = this.tabStates[tab];
    const targetPage = typeof page === 'number' ? page : currentState.currentPage;
    const pageSize = currentState.pageSize || this.defaultPageSize;

    this.setTabState(tab, { loading: true, error: null });
    this.cdr.detectChanges();

    if (tab === 'APPROVED') {
      this.loadApprovedInvoices(companyId, targetPage, pageSize);
    } else {
      this.loadDraftInvoices(companyId, targetPage, pageSize);
    }
  }

  private loadApprovedInvoices(companyId: number, page: number, pageSize: number) {
    const params: any = {
      page,
      size: pageSize,
    };

    // Add months parameter for preset periods, or dates for custom
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
        const totalPages = pageData?.totalPages || 0;
        const totalItems = pageData?.totalElements || content.length;
        const currentPage = pageData?.number || page;
        const size = pageData?.size || pageSize;

        this.setTabState('APPROVED', {
          invoices: content,
          allInvoices: [...content],
          loading: false,
          error: null,
          initialized: true,
          currentPage,
          totalPages,
          totalItems,
          pageSize: size,
        });

        this.applySearchFilter();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Invoice load error:', err);
        const message = err?.error?.message || 'Unable to load approved invoices.';
        this.setTabState('APPROVED', {
          invoices: [],
          allInvoices: [],
          loading: false,
          error: message,
          initialized: true,
          totalPages: 0,
          totalItems: 0,
          currentPage: 0,
          pageSize,
        });
        this.cdr.detectChanges();
      },
    });
  }

  private loadDraftInvoices(companyId: number, page: number, pageSize: number) {
    this.invoiceService.getDraftedInvoice(companyId).subscribe({
      next: (res: any) => {
        const pageData = res?.data;
        const content = pageData?.content || [];
        const totalPages = pageData?.totalPages || 0;
        const totalItems = pageData?.totalElements || content.length;

        this.setTabState('DRAFT', {
          invoices: content,
          allInvoices: [...content],
          loading: false,
          error: null,
          initialized: true,
          currentPage: 0,
          totalPages,
          totalItems,
          pageSize,
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Draft invoice load error:', err);
        const message = err?.error?.message || 'Unable to load draft invoices.';
        this.setTabState('DRAFT', {
          invoices: [],
          allInvoices: [],
          loading: false,
          error: message,
          initialized: true,
          totalPages: 0,
          totalItems: 0,
          currentPage: 0,
          pageSize,
        });
        this.cdr.detectChanges();
      },
    });
  }

  openApproveModal(invoice: Invoice, event: Event): void {
    event.stopPropagation(); // Prevent row click
    this.invoiceToApprove = invoice;
    this.approveModalOpen = true;
    this.cdr.detectChanges();
  }

  closeApproveModal(): void {
    if (this.approvingInvoiceId) {
      return; // Don't close while approving
    }
    this.approveModalOpen = false;
    this.invoiceToApprove = null;
    this.cdr.detectChanges();
  }

  confirmApproveInvoice(): void {
    if (!this.invoiceToApprove || this.approvingInvoiceId) {
      return;
    }

    const invoiceId = this.invoiceToApprove.id;
    const invoiceNumber = this.invoiceToApprove.invoiceNumber;
    this.approvingInvoiceId = invoiceId;
    this.cdr.detectChanges();

    // First approve the invoice
    this.invoiceService.approveInvoice(invoiceId).subscribe({
      next: (approveRes) => {
        console.log('Invoice approved successfully:', approveRes);

        // Then send the invoice
        this.invoiceService.sendInvoice(invoiceId).subscribe({
          next: (sendRes) => {
            console.log('Invoice sent successfully:', sendRes);
            this.approvingInvoiceId = null;
            this.closeApproveModal();

            // Show success message
            this.toastr.success(
              `Invoice ${invoiceNumber} has been approved and sent successfully.`,
              'Success',
            );

            // Reload both tabs to reflect the change
            if (this.activeCompanyId) {
              this.loadInvoices(this.activeCompanyId, 'DRAFT');
              this.loadInvoices(this.activeCompanyId, 'APPROVED');
            }

            this.cdr.detectChanges();
          },
          error: (sendErr) => {
            console.error('Invoice send error:', sendErr);
            const message = sendErr?.error?.message || 'Failed to send invoice.';
            this.approvingInvoiceId = null;
            this.closeApproveModal();

            // Show warning - approved but not sent
            this.toastr.warning(
              `Invoice ${invoiceNumber} was approved but could not be sent: ${message}`,
              'Partial Success',
              { timeOut: 5000 },
            );

            // Still reload to show the approved invoice
            if (this.activeCompanyId) {
              this.loadInvoices(this.activeCompanyId, 'DRAFT');
              this.loadInvoices(this.activeCompanyId, 'APPROVED');
            }

            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        console.error('Invoice approval error:', err);
        const message = err?.error?.message || 'Unable to approve invoice.';
        this.approvingInvoiceId = null;

        // Show error message
        this.toastr.error(message, 'Approval Failed');

        this.cdr.detectChanges();
      },
    });
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

  onSearchChange(): void {
    this.applySearchFilter();
  }

  private applySearchFilter() {
    const term = this.searchName.trim().toLowerCase();
    const state = this.activeTabState;

    if (term.length < 3) {
      this.setTabState(this.activeTab, {
        invoices: [...state.allInvoices],
      });
      return;
    }

    const filtered = state.allInvoices.filter((inv) =>
      inv.customer.customerName.toLowerCase().includes(term),
    );

    this.setTabState(this.activeTab, {
      invoices: filtered,
    });
  }

  // Handle period dropdown change (only for APPROVED tab)
  onPeriodChange(): void {
    if (this.activeTab !== 'APPROVED') {
      return;
    }

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

  private reloadWithFilters() {
    if (!this.activeCompanyId || this.activeTab !== 'APPROVED') {
      return;
    }
    this.loadInvoices(this.activeCompanyId, 'APPROVED', 0);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const state = this.activeTabState;
    const total = state.totalPages;

    if (total <= 0) {
      return pages;
    }

    const current = state.currentPage + 1; // Convert to 1-based

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current <= 3) {
        // Near the beginning
        pages.push(2, 3, 4, -1, total);
      } else if (current >= total - 2) {
        // Near the end
        pages.push(-1, total - 3, total - 2, total - 1, total);
      } else {
        // In the middle
        pages.push(-1, current - 1, current, current + 1, -1, total);
      }
    }

    return pages;
  }

  goToPage(page: number): void {
    if (!this.activeCompanyId) {
      return;
    }
    const state = this.activeTabState;
    if (page < 0 || page >= state.totalPages || page === state.currentPage) {
      return;
    }
    this.loadInvoices(this.activeCompanyId, this.activeTab, page);
  }

  nextPage() {
    if (!this.activeCompanyId) {
      return;
    }
    const state = this.activeTabState;
    if (state.currentPage < state.totalPages - 1) {
      this.loadInvoices(this.activeCompanyId, this.activeTab, state.currentPage + 1);
    }
  }

  prevPage() {
    if (!this.activeCompanyId) {
      return;
    }
    const state = this.activeTabState;
    if (state.currentPage > 0) {
      this.loadInvoices(this.activeCompanyId, this.activeTab, state.currentPage - 1);
    }
  }

  formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US');
  }

  getStatus(invoice: Invoice) {
    return invoice.status === 'PAID' ? 'Paid' : 'Due';
  }

  openInvoice(invoiceId: number) {
    this.router.navigate(['/admin/invoices/detail', invoiceId]);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
