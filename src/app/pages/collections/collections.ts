import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Customer } from '../../services/customer';
import { CollectionService } from '../../services/collection-service';
import { Spinner } from '../../shared/spinner/spinner';
import { Invoice } from '../../models/invoice.model';
import { CompanyService } from '../../services/company-service';
import { PromiseToPayRecord } from '../../models/promise-to-pay.model';

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
export class Collections implements OnInit {
  customers: any[] = [];
  selectedCustomerId: string = '';

  companies: any[] = [];
  selectedCompanyId: string = '';
  companyOverdueAmount = 0;
  loadingCompanyOverdue = false;

  customerInvoices: Invoice[] = [];
  selectedInvoiceId: number | null = null;
  selectedInvoice: Invoice | null = null;
  loadingInvoices = false;

  overdueAmount = 0;
  loadingOverdue = false;

  amountPromised: number | null = null;
  promiseDate: string = '';
  notes: string = '';

  showPromisePopup = false;
  savingPromise = false;
  submitted = false;

  activeTab: 'promise' | 'reminders' = 'promise';

  /** ✅ PROMISE TO PAY LIST */
  promiseToPayList: PromiseToPayRecord[] = [];
  loadingPromiseToPay = false;

  creditsToApply: CreditItem[] = [
    { customer: 'Acme Corp', totalDue: 32000, lastActivity: 'Note 2 days' },
    { customer: 'Global Enterprises', totalDue: 32000, lastActivity: 'Email 6 days ago' },
  ];

  followUpReminders: ReminderItem[] = [
    { customer: 'Acme Corp', dueDate: 'May 5, 2024', action: 'Call' },
    { customer: 'Global Enterprises', dueDate: 'May 5, 2024', action: 'Call' },
  ];

  promiseToPayMessage = 'No promises to pay have been logged.';

  constructor(
    private customerService: Customer,
    private collectionService: CollectionService,
    private companyService: CompanyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadCustomers();
    this.loadCompanies();
    this.loadPromiseToPay();
  }

  setTab(tab: 'promise' | 'reminders') {
    this.activeTab = tab;

    if (tab === 'promise') {
      this.loadPromiseToPay();
    }
  }

  loadCustomers() {
    this.collectionService.getPendingCustomer().subscribe({
      next: (res) => {
        this.customers = Array.isArray(res?.data) ? res.data : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.customers = [];
        this.cdr.detectChanges();
      },
    });
  }

  loadCompanies() {
    this.companyService.getCompany(0, 50).subscribe({
      next: (res) => {
        this.companies = res?.data?.content || [];

        if (!this.selectedCompanyId && this.companies.length > 0) {
          this.selectedCompanyId = String(this.companies[0].id);
          this.fetchCompanyOverdue(+this.selectedCompanyId);
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.companies = [];
        this.cdr.detectChanges();
      },
    });
  }

  onCompanyChange() {
    if (!this.selectedCompanyId) {
      this.companyOverdueAmount = 0;
      this.loadingCompanyOverdue = false;
      this.cdr.detectChanges();
      return;
    }

    this.fetchCompanyOverdue(+this.selectedCompanyId);
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
      next: (res) => {
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
    this.loadingPromiseToPay = true;
    this.cdr.detectChanges();

    this.collectionService.getPromiseToPay().subscribe({
      next: (res) => {
        this.promiseToPayList = Array.isArray(res?.data) ? res.data : [];

        console.log('Promise To Pay:', this.promiseToPayList);

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
      next: (res) => {
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
      next: (res) => {
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

    const payload = {
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

  logCall() {
    console.log('Log Call clicked');
  }

  newReminder() {
    console.log('New Reminder clicked');
  }
}
