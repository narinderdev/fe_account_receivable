import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Customer } from '../../services/customer';
import { Router } from '@angular/router';
import { CollectionService } from '../../services/collection-service';
import { Spinner } from '../../shared/spinner/spinner';
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
} from '../../models/collection.model';
import { CustomerEntity, PaginatedResponse } from '../../models/customer.model';

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
  imports: [CommonModule, FormsModule, Spinner],
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

  activeTab: 'promise' | 'disputes' = 'promise';

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

  constructor(
    private customerService: Customer,
    private collectionService: CollectionService,
    private companySelection: CompanySelectionService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit() {
    this.watchCompanySelection();
    this.loadPromiseToPay();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: 'promise' | 'disputes') {
    this.activeTab = tab;

    if (tab === 'promise') {
      this.loadPromiseToPay();
    } else if (tab === 'disputes' && this.selectedCompanyId) {
      this.loadDisputes(this.selectedCompanyId);
    }
  }

  loadCustomers(companyId: number) {
    if (!companyId) {
      this.customers = [];
      this.cdr.detectChanges();
      return;
    }

    this.collectionService.getPendingCustomer(companyId).subscribe({
      next: (res: PendingCustomerResponse) => {
        this.customers = Array.isArray(res?.data) ? res.data : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.customers = [];
        this.cdr.detectChanges();
      },
    });
  }

  private watchCompanySelection() {
    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        const parsed = id ? Number(id) : NaN;
        const nextId = Number.isFinite(parsed) ? parsed : null;

        if (this.selectedCompanyId === nextId) {
          return;
        }

        this.selectedCompanyId = nextId;

        if (this.selectedCompanyId) {
          this.fetchCompanyOverdue(this.selectedCompanyId);
          this.loadCustomers(this.selectedCompanyId);
          if (this.activeTab === 'disputes') {
            this.loadDisputes(this.selectedCompanyId);
          } else {
            this.loadPromiseToPay();
          }
        } else {
          this.companyOverdueAmount = 0;
          this.loadingCompanyOverdue = false;
          this.customers = [];
          this.selectedCustomerId = '';
          this.promiseToPayList = [];
          this.disputes = [];
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
    if (!this.selectedCompanyId) {
      this.promiseToPayList = [];
      return;
    }

    this.loadingPromiseToPay = true;
    this.cdr.detectChanges();

    this.collectionService.getPromiseToPay(this.selectedCompanyId).subscribe({
      next: (res: PromiseToPayResponse) => {
        this.promiseToPayList = Array.isArray(res?.data) ? res.data : [];
        this.loadingPromiseToPay = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.promiseToPayList = [];
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
    if (this.disputedAmount && this.disputeInvoiceAmount && this.disputedAmount > this.disputeInvoiceAmount) {
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
    this.loadingDisputes = true;
    this.collectionService.getDisputes(companyId).subscribe({
      next: (res: DisputeResponse) => {
        this.disputes = Array.isArray(res.data) ? res.data : [];
        this.loadingDisputes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.disputes = [];
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
}
