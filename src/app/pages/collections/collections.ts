import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Customer } from '../../services/customer';
import { Router } from '@angular/router';
import { CollectionService } from '../../services/collection-service';
import { Spinner } from '../../shared/spinner/spinner';
import { Loader } from '../../shared/loader/loader';
import { InvoiceWithItems, CustomerInvoiceListResponse } from '../../models/invoice.model';
import { PromiseToPayRecord, PromiseToPayResponse } from '../../models/promise-to-pay.model';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  PendingCustomerResponse,
  PendingCustomerSummary,
  PendingAmountResponse,
  CreatePromiseToPayRequest,
  DisputeCode,
  CreateDisputeRequest,
  DisputeRecord,
  DisputeResponse,
  OverdueInvoice,
  OverdueInvoicesResponse,
} from '../../models/collection.model';
import { CustomerEntity, PaginatedResponse } from '../../models/customer.model';
import { UserContextService } from '../../services/user-context.service';

interface CreditItem {
  customer: string;
  totalDue: number;
  lastActivity: string;
}

interface ReminderItem {
  customer: string;
  dueDate: string;
  action: string;
}

@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [CommonModule, FormsModule, Spinner, Loader],
  templateUrl: './collections.html',
  styleUrls: ['./collections.css'],
})
export class Collections implements OnInit, OnDestroy {
  customers: PendingCustomerSummary[] = [];
  selectedCustomerId: string = '';

  selectedCompanyId: number | null = null;
  companyOverdueAmount = 0;
  loadingCompanyOverdue = false;

  customerInvoices: InvoiceWithItems[] = [];
  selectedInvoiceId: number | null = null;
  selectedInvoice: InvoiceWithItems | null = null;
  loadingInvoices = false;

  overdueAmount = 0;
  loadingOverdue = false;

  amountPromised: number | null = null;
  promiseDate: string = '';
  notes: string = '';

  showPromisePopup = false;
  savingPromise = false;
  submitted = false;

  activeTab: 'collections' | 'promise' | 'disputes' | 'followUps' = 'collections';

  promiseToPayList: PromiseToPayRecord[] = [];
  loadingPromiseToPay = false;
  disputes: DisputeRecord[] = [];
  loadingDisputes = false;
  showDisputePopup = false;
  disputeSubmitted = false;
  disputeCustomers: CustomerEntity[] = [];
  disputeInvoices: InvoiceWithItems[] = [];
  selectedDisputeCustomerId: number | null = null;
  selectedDisputeInvoiceId: number | null = null;
  disputeInvoiceAmount: number | null = null;
  disputedAmount: number | null = null;
  resolutionDate = '';
  disputeReason = '';
  loadingDisputeCustomers = false;
  loadingDisputeInvoices = false;
  disputeCodes: DisputeCode[] = [];
  selectedDisputeCode: string = '';

  creditsToApply: CreditItem[] = [
    { customer: 'Acme Corp', totalDue: 32000, lastActivity: 'Note 2 days' },
    { customer: 'Global Enterprises', totalDue: 32000, lastActivity: 'Email 6 days ago' },
  ];

  // followUpReminders: ReminderItem[] = [
  //   { customer: 'Acme Corp', dueDate: 'May 5, 2024', action: 'Call' },
  //   { customer: 'Global Enterprises', dueDate: 'May 5, 2024', action: 'Call' },
  // ];

  promiseToPayMessage = 'No promises to pay have been logged.';
  private destroy$ = new Subject<void>();
  followUpReminders: PendingCustomerSummary[] = [];
  loadingFollowUp = false;
  overdueInvoices: OverdueInvoice[] = [];
  loadingOverdueInvoices = false;
  canViewReminders = true;
  canCreatePromise = false;
  canViewPromise = false;
  canViewDisputes = false;
  canCreateDispute = false;
  allFollowUpReminders: PendingCustomerSummary[] = [];
  allPromiseToPay: PromiseToPayRecord[] = [];
  allDisputes: DisputeRecord[] = [];
  allOverdueInvoices: OverdueInvoice[] = [];
  collectionsPagination = this.createPagination();
  promisePagination = this.createPagination();
  disputesPagination = this.createPagination();
  followUpsPagination = this.createPagination();
  Math = Math;
  reminderSending: { [invoiceId: number]: boolean } = {};
  reminderSent: { [invoiceId: number]: boolean } = {};

  constructor(
    private customerService: Customer,
    private collectionService: CollectionService,
    private companySelection: CompanySelectionService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private router: Router,
    private userContext: UserContextService
  ) {
    this.canCreatePromise = this.userContext.hasPermission('CREATE_PROMISE_TO_PAY');
    this.canViewPromise = this.userContext.hasPermission('VIEW_PROMISE_TO_PAY');
    this.canViewDisputes = this.userContext.hasPermission('VIEW_DISPUTE');
    this.canCreateDispute = this.userContext.hasPermission('CREATE_DISPUTE');
    this.activeTab = this.canViewReminders
      ? 'collections'
      : this.canViewPromise
        ? 'promise'
        : this.canViewDisputes
          ? 'disputes'
          : 'collections';
  }

  get isComponentLoading(): boolean {
    const reminderActive = Object.values(this.reminderSending).some((value) => value);
    return (
      this.loadingCompanyOverdue ||
      this.loadingFollowUp ||
      this.loadingPromiseToPay ||
      this.loadingDisputes ||
      this.loadingOverdueInvoices ||
      this.loadingOverdue ||
      this.loadingInvoices ||
      this.loadingDisputeCustomers ||
      this.loadingDisputeInvoices ||
      this.savingPromise ||
      reminderActive
    );
  }

  ngOnInit() {
    this.watchCompanySelection();
    this.loadPromiseToPay();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: 'collections' | 'promise' | 'disputes' | 'followUps') {
    if (
      (tab === 'collections' && !this.canViewReminders) ||
      (tab === 'promise' && !this.canViewPromise) ||
      (tab === 'disputes' && !this.canViewDisputes) ||
      (tab === 'followUps' && !this.canViewReminders)
    ) {
      return;
    }
    this.activeTab = tab;

    if (tab === 'collections') {
      if (this.selectedCompanyId) {
        this.loadPendingCustomers(this.selectedCompanyId);
      }
    } else if (tab === 'promise') {
      this.loadPromiseToPay();
    } else if (tab === 'disputes' && this.selectedCompanyId) {
      this.loadDisputes(this.selectedCompanyId);
    } else if (tab === 'followUps') {
      this.loadOverdueInvoices(this.selectedCompanyId);
    }
  }

  private loadPendingCustomers(companyId: number) {
    if (!companyId) {
      this.customers = [];
      this.allFollowUpReminders = [];
      this.followUpReminders = [];
      this.collectionsPagination = this.createPagination();
      this.loadingFollowUp = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadingFollowUp = true;
    this.cdr.detectChanges();

    this.collectionService.getOverdueBalanceList(companyId).subscribe({
      next: (res: PendingCustomerResponse) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.customers = list;
        this.allFollowUpReminders = list;
        this.collectionsPagination = this.createPagination();
        this.followUpReminders = this.applyPagination(
          this.allFollowUpReminders,
          this.collectionsPagination,
          0
        );
        this.loadingFollowUp = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.customers = [];
        this.allFollowUpReminders = [];
        this.followUpReminders = [];
        this.collectionsPagination = this.createPagination();
        this.loadingFollowUp = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadOverdueInvoices(companyId: number | null) {
    if (!companyId || !this.canViewReminders) {
      this.overdueInvoices = [];
      this.allOverdueInvoices = [];
      this.followUpsPagination = this.createPagination();
      this.loadingOverdueInvoices = false;
      this.cdr.detectChanges();
      this.reminderSending = {};
      this.reminderSent = {};
      return;
    }

    this.reminderSending = {};
    this.reminderSent = {};
    this.loadingOverdueInvoices = true;
    this.cdr.detectChanges();

    this.collectionService.getOverdueInvoices(companyId).subscribe({
      next: (res: OverdueInvoicesResponse) => {
        this.allOverdueInvoices = Array.isArray(res?.data) ? res.data : [];
        this.followUpsPagination = this.createPagination();
        this.overdueInvoices = this.applyPagination(
          this.allOverdueInvoices,
          this.followUpsPagination,
          0
        );
        this.loadingOverdueInvoices = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.allOverdueInvoices = [];
        this.overdueInvoices = [];
        this.followUpsPagination = this.createPagination();
        this.loadingOverdueInvoices = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.cdr.detectChanges();
      },
    });
  }

  private watchCompanySelection() {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;

      if (this.selectedCompanyId === nextId) {
        return;
      }

      this.selectedCompanyId = nextId;

        if (this.selectedCompanyId) {
          this.fetchCompanyOverdue(this.selectedCompanyId);
          this.loadPendingCustomers(this.selectedCompanyId);
          this.loadOverdueInvoices(this.selectedCompanyId);
          if (this.activeTab === 'disputes' && this.canViewDisputes) {
            this.loadDisputes(this.selectedCompanyId);
          } else if (this.activeTab === 'promise' && this.canViewPromise) {
            this.loadPromiseToPay();
          }
        } else {
          this.companyOverdueAmount = 0;
          this.loadingCompanyOverdue = false;
          this.customers = [];
          this.allFollowUpReminders = [];
          this.followUpReminders = [];
          this.loadingFollowUp = false;
          this.overdueInvoices = [];
          this.allOverdueInvoices = [];
          this.loadingOverdueInvoices = false;
          this.selectedCustomerId = '';
          this.allPromiseToPay = [];
          this.promiseToPayList = [];
          this.allDisputes = [];
          this.disputes = [];
          this.collectionsPagination = this.createPagination();
          this.promisePagination = this.createPagination();
          this.disputesPagination = this.createPagination();
          this.followUpsPagination = this.createPagination();
          this.reminderSending = {};
          this.reminderSent = {};
          this.cdr.detectChanges();
        }
      });
  }

  fetchCompanyOverdue(companyId: number) {
    if (!companyId) {
      this.companyOverdueAmount = 0;
      this.loadingCompanyOverdue = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadingCompanyOverdue = true;
    this.cdr.detectChanges();

    this.collectionService.getCompanyOverdue(companyId).subscribe({
      next: (res: PendingAmountResponse) => {
        this.companyOverdueAmount = res?.data ?? 0;
        this.loadingCompanyOverdue = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.companyOverdueAmount = 0;
        this.loadingCompanyOverdue = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadPromiseToPay() {
    if (!this.selectedCompanyId || !this.canViewPromise) {
      this.promiseToPayList = [];
      this.allPromiseToPay = [];
      this.promisePagination = this.createPagination();
      this.loadingPromiseToPay = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadingPromiseToPay = true;
    this.cdr.detectChanges();

    this.collectionService.getPromiseToPay(this.selectedCompanyId).subscribe({
      next: (res: PromiseToPayResponse) => {
        this.allPromiseToPay = Array.isArray(res?.data) ? res.data : [];
        this.promisePagination = this.createPagination();
        this.promiseToPayList = this.applyPagination(
          this.allPromiseToPay,
          this.promisePagination,
          0
        );
        this.loadingPromiseToPay = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.allPromiseToPay = [];
        this.promiseToPayList = [];
        this.promisePagination = this.createPagination();
        this.loadingPromiseToPay = false;
        this.cdr.detectChanges();
      },
    });
  }

  onCustomerChange() {
    if (!this.selectedCustomerId) {
      this.resetCustomerDependentData();
      return;
    }

    this.loadingOverdue = true;
    this.loadingInvoices = true;

    this.collectionService.getOverdueBalance(+this.selectedCustomerId).subscribe({
      next: (res: PendingAmountResponse) => {
        this.overdueAmount = res?.data ?? 0;
        this.loadingOverdue = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.overdueAmount = 0;
        this.loadingOverdue = false;
        this.cdr.detectChanges();
      },
    });

    this.customerService.getCustomerInvoicesById(+this.selectedCustomerId).subscribe({
      next: (res: CustomerInvoiceListResponse) => {
        this.customerInvoices = Array.isArray(res?.data) ? res.data : [];
        this.selectedInvoiceId = null;
        this.selectedInvoice = null;
        this.loadingInvoices = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.customerInvoices = [];
        this.loadingInvoices = false;
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
      OPEN: 'Open',
      PARTIAL: 'Partial',
      UNDER_REVIEW: 'Under Review',
      RESOLVED: 'Resolved',
      REJECTED: 'Rejected',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      PENDING: 'status-pending',
      PARTIAL: 'status-partial',
      DUE_TODAY: 'status-due-today',
      BROKEN: 'status-broken',
      COMPLETED: 'status-completed',
      OPEN: 'status-open',
      UNDER_REVIEW: 'status-under-review',
      RESOLVED: 'status-resolved',
      REJECTED: 'status-rejected',
    };
    return classes[status] || 'status-default';
  }

  getInitialColor(index: number): { background: string; color: string } {
    const palette = [
      { background: '#DBEAFE', color: '#2563EB' }, // Blue
      { background: '#F3E8FF', color: '#9333EA' }, // Purple
      { background: '#FFEDD5', color: '#EA580C' }, // Orange
      { background: '#FEE2E2', color: '#DC2626' }, // Red
      { background: '#E0E7FF', color: '#4F46E5' }, // Indigo
      { background: '#CCFBF1', color: '#0D9488' }, // Teal
    ];

    const colorIndex = index % palette.length;
    return palette[colorIndex];
  }

  onInvoiceChange() {
    const invoiceId = Number(this.selectedInvoiceId);

    this.selectedInvoice = this.customerInvoices.find((inv) => inv.id === invoiceId) || null;

    if (this.selectedInvoice) {
      this.amountPromised = this.selectedInvoice.balanceDue;
    }

    this.cdr.detectChanges();
  }

  openPromisePopup() {
    if (!this.canCreatePromise) {
      return;
    }
    this.showPromisePopup = true;
    this.submitted = false;
  }

  closePromisePopup() {
    this.resetForm();
    this.showPromisePopup = false;
    this.cdr.detectChanges();
  }

  savePromise() {
    this.submitted = true;

    if (
      !this.selectedCustomerId ||
      this.amountPromised === null ||
      this.amountPromised <= 0 ||
      this.amountPromised > this.overdueAmount ||
      !this.promiseDate
    ) {
      return;
    }

    const payload: CreatePromiseToPayRequest = {
      customerId: +this.selectedCustomerId,
      // invoiceId: this.selectedInvoiceId,
      amountPromised: this.amountPromised,
      promiseDate: this.promiseDate,
      notes: this.notes || '',
    };

    this.savingPromise = true;

    this.collectionService.createPromiseToPay(payload).subscribe({
      next: () => {
        this.savingPromise = false;
        this.closePromisePopup();

        this.activeTab = 'promise';
        this.loadPromiseToPay();
        this.cdr.detectChanges();
      },
      error: () => {
        this.savingPromise = false;
      },
    });
  }

  openDisputePopup() {
    if (!this.canCreateDispute) {
      return;
    }
    if (!this.selectedCompanyId || this.loadingDisputeCustomers) {
      this.selectedDisputeCustomerId = null;
      this.disputeInvoices = [];
    }

    this.showDisputePopup = true;
    this.disputeSubmitted = false;
    this.disputedAmount = null;
    this.resolutionDate = '';
    this.disputeReason = '';
    this.selectedDisputeCode = '';
    this.selectedDisputeInvoiceId = null;
    this.disputeInvoiceAmount = null;

    if (this.selectedCompanyId) {
      this.fetchDisputeCustomers(this.selectedCompanyId);
    }

    this.collectionService.getDisputeCode().subscribe({
      next: (res) => {
        this.disputeCodes = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.disputeCodes = [];
        this.cdr.detectChanges();
      },
    });
  }

  closeDisputePopup() {
    this.resetDisputeState();
    this.showDisputePopup = false;
    this.cdr.detectChanges();
  }

  private fetchDisputeCustomers(companyId: number) {
    this.loadingDisputeCustomers = true;
    this.customerService.getCustomers(companyId, 0, 100).subscribe({
      next: (res: { data?: PaginatedResponse<CustomerEntity> }) => {
        this.disputeCustomers = res?.data?.content ?? [];
        this.loadingDisputeCustomers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.disputeCustomers = [];
        this.loadingDisputeCustomers = false;
        this.cdr.detectChanges();
      },
    });
  }

  onDisputeCustomerChange() {
    if (!this.selectedDisputeCustomerId) {
      this.disputeInvoices = [];
      this.selectedDisputeInvoiceId = null;
      this.disputeInvoiceAmount = null;
      return;
    }

    this.loadingDisputeInvoices = true;
    this.customerService.getCustomerInvoicesById(this.selectedDisputeCustomerId).subscribe({
      next: (res: CustomerInvoiceListResponse) => {
        this.disputeInvoices = Array.isArray(res.data) ? res.data : [];
        this.loadingDisputeInvoices = false;
        this.selectedDisputeInvoiceId = null;
        this.disputeInvoiceAmount = null;
        this.disputedAmount = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.disputeInvoices = [];
        this.loadingDisputeInvoices = false;
        this.selectedDisputeInvoiceId = null;
        this.disputeInvoiceAmount = null;
        this.disputedAmount = null;
        this.cdr.detectChanges();
      },
    });
  }

  onDisputeInvoiceChange() {
    const invoiceId = Number(this.selectedDisputeInvoiceId);
    const invoice = this.disputeInvoices.find((item) => item.id === invoiceId);
    this.disputeInvoiceAmount = invoice?.balanceDue ?? invoice?.totalAmount ?? null;
    if (
      this.disputedAmount &&
      this.disputeInvoiceAmount &&
      this.disputedAmount > this.disputeInvoiceAmount
    ) {
      this.disputedAmount = this.disputeInvoiceAmount;
    }
    this.cdr.detectChanges();
  }

  saveDispute() {
    this.disputeSubmitted = true;

    const hasValidCustomer = !!this.selectedDisputeCustomerId;
    const hasValidInvoice = !!this.selectedDisputeInvoiceId;
    const invoiceAmount = this.disputeInvoiceAmount ?? 0;
    const disputedAmount = this.disputedAmount ?? 0;
    const hasValidAmount =
      disputedAmount > 0 && (!this.disputeInvoiceAmount || disputedAmount <= invoiceAmount);
    const hasReason = !!this.disputeReason.trim();
    const hasCode = !!this.selectedDisputeCode;
    const hasResolutionDate =
      !!this.resolutionDate && new Date(this.resolutionDate) >= this.todayWithoutTime();

    if (
      !hasValidCustomer ||
      !hasValidInvoice ||
      !hasValidAmount ||
      !hasReason ||
      !hasCode ||
      !hasResolutionDate
    ) {
      return;
    }

    const payload: CreateDisputeRequest = {
      customerId: this.selectedDisputeCustomerId!,
      invoiceId: this.selectedDisputeInvoiceId!,
      disputeCode: this.selectedDisputeCode,
      disputedAmount,
      reason: this.disputeReason.trim(),
      resolutionDate: this.resolutionDate,
    };

    this.collectionService.createDispute(payload).subscribe({
      next: () => {
        this.closeDisputePopup();
      },
      error: () => {
        this.toastr.error('Failed to create dispute');
      },
    });
  }

  loadDisputes(companyId: number) {
    if (!this.canViewDisputes) {
      this.disputes = [];
      this.allDisputes = [];
      this.disputesPagination = this.createPagination();
      this.loadingDisputes = false;
      this.cdr.detectChanges();
      return;
    }
    this.loadingDisputes = true;
    this.collectionService.getDisputes(companyId).subscribe({
      next: (res: DisputeResponse) => {
        this.allDisputes = Array.isArray(res.data) ? res.data : [];
        this.disputesPagination = this.createPagination();
        this.disputes = this.applyPagination(this.allDisputes, this.disputesPagination, 0);
        this.loadingDisputes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.allDisputes = [];
        this.disputes = [];
        this.disputesPagination = this.createPagination();
        this.loadingDisputes = false;
        this.cdr.detectChanges();
      },
    });
  }

  todayWithoutTime() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  get minResolutionDate(): string {
    return this.todayWithoutTime().toISOString().split('T')[0];
  }

  isResolutionDatePast(): boolean {
    if (!this.resolutionDate) {
      return false;
    }
    const selected = new Date(this.resolutionDate);
    return selected < this.todayWithoutTime();
  }

  resetCustomerDependentData() {
    this.overdueAmount = 0;
    this.customerInvoices = [];
    this.selectedInvoiceId = null;
    this.selectedInvoice = null;
    this.loadingOverdue = false;
    this.loadingInvoices = false;
  }

  resetForm() {
    this.selectedCustomerId = '';
    this.selectedInvoiceId = null;
    this.selectedInvoice = null;
    this.customerInvoices = [];
    this.amountPromised = null;
    this.promiseDate = '';
    this.notes = '';
    this.overdueAmount = 0;
    this.submitted = false;
    this.loadingOverdue = false;
    this.loadingInvoices = false;
  }

  private resetDisputeState() {
    this.disputeCustomers = [];
    this.disputeInvoices = [];
    this.selectedDisputeCustomerId = null;
    this.selectedDisputeInvoiceId = null;
    this.disputeInvoiceAmount = null;
    this.disputedAmount = null;
    this.resolutionDate = '';
    this.disputeReason = '';
    this.selectedDisputeCode = '';
    this.disputeSubmitted = false;
    this.loadingDisputeCustomers = false;
    this.loadingDisputeInvoices = false;
  }

  logCall() {
    console.log('Log Call clicked');
  }

  viewDisputeDetail(id: number) {
    this.router.navigate(['/admin/collections/disputes', id]);
  }

  sendReminder(invoiceId: number) {
    if (!invoiceId || this.reminderSending[invoiceId]) {
      return;
    }

    this.reminderSending[invoiceId] = true;
    this.collectionService.sendReminders(invoiceId).subscribe({
      next: (res) => {
        const message = res?.message || 'Reminder sent successfully.';
        this.toastr.success(message);
        this.reminderSent[invoiceId] = true;
        this.reminderSending[invoiceId] = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Failed to send reminder.');
        this.reminderSending[invoiceId] = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.cdr.detectChanges();
      },
    });
  }

  getPageNumbers(pagination: PaginationState): number[] {
    const pages: number[] = [];
    const current = pagination.currentPage + 1;
    const total = pagination.totalPages;

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

  goToCollectionsPage(page: number) {
    this.followUpReminders = this.applyPagination(
      this.allFollowUpReminders,
      this.collectionsPagination,
      page
    );
  }

  collectionsNextPage() {
    if (this.collectionsPagination.currentPage < this.collectionsPagination.totalPages - 1) {
      this.goToCollectionsPage(this.collectionsPagination.currentPage + 1);
    }
  }

  collectionsPrevPage() {
    if (this.collectionsPagination.currentPage > 0) {
      this.goToCollectionsPage(this.collectionsPagination.currentPage - 1);
    }
  }

  goToFollowUpsPage(page: number) {
    this.overdueInvoices = this.applyPagination(
      this.allOverdueInvoices,
      this.followUpsPagination,
      page
    );
  }

  followUpsNextPage() {
    if (this.followUpsPagination.currentPage < this.followUpsPagination.totalPages - 1) {
      this.goToFollowUpsPage(this.followUpsPagination.currentPage + 1);
    }
  }

  followUpsPrevPage() {
    if (this.followUpsPagination.currentPage > 0) {
      this.goToFollowUpsPage(this.followUpsPagination.currentPage - 1);
    }
  }

  goToPromisePage(page: number) {
    this.promiseToPayList = this.applyPagination(this.allPromiseToPay, this.promisePagination, page);
  }

  promiseNextPage() {
    if (this.promisePagination.currentPage < this.promisePagination.totalPages - 1) {
      this.goToPromisePage(this.promisePagination.currentPage + 1);
    }
  }

  promisePrevPage() {
    if (this.promisePagination.currentPage > 0) {
      this.goToPromisePage(this.promisePagination.currentPage - 1);
    }
  }

  goToDisputesPage(page: number) {
    this.disputes = this.applyPagination(this.allDisputes, this.disputesPagination, page);
  }

  disputesNextPage() {
    if (this.disputesPagination.currentPage < this.disputesPagination.totalPages - 1) {
      this.goToDisputesPage(this.disputesPagination.currentPage + 1);
    }
  }

  disputesPrevPage() {
    if (this.disputesPagination.currentPage > 0) {
      this.goToDisputesPage(this.disputesPagination.currentPage - 1);
    }
  }

  private createPagination(pageSize = 10): PaginationState {
    return {
      pageSize,
      currentPage: 0,
      totalPages: 0,
      totalItems: 0,
    };
  }

  private applyPagination<T>(
    source: T[],
    pagination: PaginationState,
    page: number
  ): T[] {
    pagination.totalItems = source.length;
    pagination.totalPages = pagination.totalItems
      ? Math.ceil(pagination.totalItems / pagination.pageSize)
      : 0;

    if (pagination.totalPages === 0) {
      pagination.currentPage = 0;
      return [];
    }

    pagination.currentPage = Math.min(
      Math.max(page, 0),
      pagination.totalPages - 1
    );

    const start = pagination.currentPage * pagination.pageSize;
    return source.slice(start, start + pagination.pageSize);
  }
}

interface PaginationState {
  pageSize: number;
  currentPage: number;
  totalPages: number;
  totalItems: number;
}
