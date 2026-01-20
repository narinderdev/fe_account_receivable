import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Customer as CustomerService } from '../../services/customer';
import { InvoiceWithItems } from '../../models/invoice.model';
import { ArCodeService } from '../../services/ar-code-service';
import { WriteOffService } from '../../services/write-off-service';
import { CreateWriteOffPayload, WriteOffEntity } from '../../models/write-off.model';
import { UserContextService } from '../../services/user-context.service';

interface CustomerOption {
  id: number;
  name: string;
}

interface ArCodeOption {
  id: number;
  name: string;
}

type WriteOffStatus = 'DRAFT' | 'APPROVED';

interface WriteOffRecord {
  id: number;
  customerName: string;
  invoiceNumber: string;
  reason: string;
  writeOffDate: string | null;
  status: WriteOffStatus;
}

type WriteOffTab = 'DRAFT' | 'APPROVED';

interface WriteOffTabState {
  records: WriteOffRecord[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

@Component({
  selector: 'app-write-off',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Loader, Spinner],
  templateUrl: './write-off.html',
  styleUrl: './write-off.css',
})
export class WriteOff implements OnInit, OnDestroy {
  customers: CustomerOption[] = [];
  arCodes: ArCodeOption[] = [];
  customerInvoices: InvoiceWithItems[] = [];
  writeOffForm: FormGroup;
  modalOpen = false;
  approveModalOpen = false;
  submitted = false;
  saving = false;
  canViewWriteOff = false;
  canCreateWriteOff = false;
  canApproveWriteOff = false;
  customerInvoicesLoading = false;
  invoiceMessage: string | null = null;
  invoiceMessageIsError = false;
  customersLoading = false;
  arCodesLoading = false;
  approvingWriteOffId: number | null = null;
  writeOffToApprove: WriteOffRecord | null = null;
  Math = Math;
  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  selectedInvoiceId: number | null = null;
  activeTab: WriteOffTab = 'DRAFT';
  private readonly defaultPageSize = 10;
  tabStates: Record<WriteOffTab, WriteOffTabState> = this.createInitialTabStates();

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService,
    private customerService: CustomerService,
    private arCodeService: ArCodeService,
    private writeOffService: WriteOffService,
    private userContext: UserContextService
  ) {
    this.canViewWriteOff = this.userContext.hasPermission('VIEW_WRITE_OFF');
    this.canCreateWriteOff = this.userContext.hasPermission('CREATE_WRITE_OFF');
    this.canApproveWriteOff = this.userContext.hasPermission('APPROVE_WRITE_OFF');
    this.writeOffForm = this.fb.group({
      customerId: ['', Validators.required],
      invoiceId: [{ value: '', disabled: true }, Validators.required],
      arCodeId: ['', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit() {
    if (!this.canViewWriteOff) {
      this.resetTabStates('You do not have permission to view write-offs.');
      this.cdr.detectChanges();
      return;
    }
    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((companyIdValue) => {
        const companyId = this.normalizeCompanyId(companyIdValue);
        if (companyId === this.activeCompanyId) {
          return;
        }
        this.activeCompanyId = companyId;
        if (!companyId) {
          this.activeTab = 'DRAFT';
          this.resetTabStates('Select a company to view write-offs.');
          this.cdr.detectChanges();
          return;
        }

        this.activeTab = 'DRAFT';
        this.resetTabStates();
        this.cdr.detectChanges();
        this.loadCustomers(companyId, true);
        this.loadArCodes(true, companyId);
        this.loadWriteOffs(companyId, 'DRAFT');
        this.loadWriteOffs(companyId, 'APPROVED');
      });
  }

  get activeTabState(): WriteOffTabState {
    return this.tabStates[this.activeTab];
  }

  setTab(tab: WriteOffTab) {
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;
    this.cdr.detectChanges();
    if (this.activeCompanyId && !this.tabStates[tab].initialized) {
      this.loadWriteOffs(this.activeCompanyId, tab);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openModal() {
    if (!this.canCreateWriteOff) {
      return;
    }
    if (!this.activeCompanyId) {
      this.toastr.warning('Select a company before creating a write-off.', 'Company Required');
      return;
    }
    this.loadCustomers(this.activeCompanyId, true);
    this.loadArCodes(true);
    this.resetFormState();
    this.submitted = false;
    this.saving = false;
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.modalOpen = false;
    this.submitted = false;
    this.saving = false;
    this.resetFormState();
    this.cdr.detectChanges();
  }

  handleCustomerSelection(customerIdValue: string | number | null) {
    const invoiceControl = this.writeOffForm.controls['invoiceId'];
    invoiceControl.setValue('');
    this.customerInvoices = [];
    this.invoiceMessage = null;
    this.invoiceMessageIsError = false;
    this.selectedInvoiceId = null;

    const customerId = Number(customerIdValue);
    if (!Number.isFinite(customerId) || customerId <= 0) {
      invoiceControl.disable({ emitEvent: false });
      return;
    }

    invoiceControl.enable({ emitEvent: false });
    this.fetchCustomerInvoices(customerId);
  }

  saveWriteOff() {
    this.submitted = true;
    if (this.writeOffForm.invalid || this.saving) {
      return;
    }

    const companyId = this.activeCompanyId;
    if (!companyId) {
      this.toastr.warning('Select a company before creating a write-off.', 'Company Required');
      return;
    }

    const formValue = this.writeOffForm.getRawValue();
    const invoiceId = Number(formValue.invoiceId);
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      this.toastr.error('Please select an invoice for this write-off.', 'Validation Error');
      return;
    }

    const payload: CreateWriteOffPayload = {
      reason: formValue.reason.trim(),
      arCodeId: Number(formValue.arCodeId),
    };

    this.saving = true;
    this.cdr.detectChanges();
    this.writeOffService.createWriteOff(payload, companyId, invoiceId).subscribe({
      next: () => {
        this.toastr.success('Write-off created successfully.', 'Success');
        this.saving = false;
        this.closeModal();
        this.loadWriteOffs(companyId, 'DRAFT');
        this.cdr.detectChanges();
      },
      error: (error) => {
        const message = error?.error?.message || 'Unable to create write-off.';
        this.toastr.error(message, 'Error');
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  openApproveModal(record: WriteOffRecord) {
    if (!this.canApproveWriteOff) {
      return;
    }
    this.writeOffToApprove = record;
    this.approveModalOpen = true;
    this.cdr.detectChanges();
  }

  closeApproveModal() {
    if (this.approvingWriteOffId) {
      return;
    }
    this.approveModalOpen = false;
    this.writeOffToApprove = null;
    this.cdr.detectChanges();
  }

  confirmApproveWriteOff() {
    if (!this.canApproveWriteOff || !this.writeOffToApprove || this.approvingWriteOffId) {
      return;
    }

    const recordId = this.writeOffToApprove.id;
    this.approvingWriteOffId = recordId;
    this.cdr.detectChanges();

    this.writeOffService.approveWriteOff(recordId).subscribe({
      next: () => {
        this.toastr.success('Write-off approved successfully.', 'Success');
        this.approvingWriteOffId = null;
        this.approveModalOpen = false;
        this.writeOffToApprove = null;
        if (this.activeCompanyId) {
          this.loadWriteOffs(this.activeCompanyId, 'DRAFT');
          this.loadWriteOffs(this.activeCompanyId, 'APPROVED');
        } else {
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        const message = error?.error?.message || 'Unable to approve write-off.';
        this.toastr.error(message, 'Error');
        this.approvingWriteOffId = null;
        this.cdr.detectChanges();
      },
    });
  }

  approveWriteOff(record: WriteOffRecord) {
    if (
      !this.canApproveWriteOff ||
      !record ||
      record.writeOffDate ||
      this.approvingWriteOffId === record.id
    ) {
      return;
    }

    this.approvingWriteOffId = record.id;
    this.cdr.detectChanges();
    this.writeOffService.approveWriteOff(record.id).subscribe({
      next: () => {
        this.toastr.success('Write-off approved successfully.', 'Success');
        this.approvingWriteOffId = null;
        if (this.activeCompanyId) {
          this.loadWriteOffs(this.activeCompanyId, 'DRAFT');
          this.loadWriteOffs(this.activeCompanyId, 'APPROVED');
        } else {
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        const message = error?.error?.message || 'Unable to approve write-off.';
        this.toastr.error(message, 'Error');
        this.approvingWriteOffId = null;
        this.cdr.detectChanges();
      },
    });
  }

  private buildInitialTabState(errorMessage: string | null): WriteOffTabState {
    return {
      records: [],
      loading: false,
      error: errorMessage,
      initialized: false,
      currentPage: 0,
      totalPages: 0,
      totalItems: 0,
      pageSize: this.defaultPageSize,
    };
  }

  private createInitialTabStates(
    errorMessage: string | null = null
  ): Record<WriteOffTab, WriteOffTabState> {
    return {
      DRAFT: this.buildInitialTabState(errorMessage),
      APPROVED: this.buildInitialTabState(errorMessage),
    };
  }

  private resetTabStates(errorMessage: string | null = null) {
    this.tabStates = this.createInitialTabStates(errorMessage);
  }

  private setTabState(status: WriteOffTab, update: Partial<WriteOffTabState>) {
    this.tabStates = {
      ...this.tabStates,
      [status]: {
        ...this.tabStates[status],
        ...update,
      },
    };
  }

  private fetchCustomerInvoices(customerId: number) {
    this.customerInvoicesLoading = true;
    this.invoiceMessage = null;
    this.invoiceMessageIsError = false;
    this.cdr.detectChanges();

    this.customerService.getCustomerInvoicesById(customerId).subscribe({
      next: (response) => {
        this.customerInvoices = response?.data ?? [];
        this.customerInvoicesLoading = false;
        if (this.customerInvoices.length === 0) {
          this.invoiceMessage = 'No invoices found for this customer.';
          this.writeOffForm.controls['invoiceId'].disable({ emitEvent: false });
        } else {
          this.writeOffForm.controls['invoiceId'].enable({ emitEvent: false });
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.customerInvoices = [];
        this.customerInvoicesLoading = false;
        this.invoiceMessage = 'Unable to load invoices.';
        this.invoiceMessageIsError = true;
        this.writeOffForm.controls['invoiceId'].disable({ emitEvent: false });
        this.toastr.error('Unable to load invoices for this customer.', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private loadWriteOffs(companyId: number, status: WriteOffTab, page?: number) {
    const currentState = this.tabStates[status];
    const targetPage = typeof page === 'number' ? page : currentState.currentPage;
    const pageSize = currentState.pageSize || this.defaultPageSize;
    this.setTabState(status, { loading: true, error: null });
    this.cdr.detectChanges();

    this.writeOffService.getCompanyWriteOff(companyId, status, targetPage, pageSize).subscribe({
      next: (response) => {
        const pageData = response?.data;
        const content = pageData?.content ?? [];
        const totalPages = pageData?.totalPages ?? 0;
        const totalItems = pageData?.totalElements ?? content.length;
        const currentPage = pageData?.number ?? targetPage;
        const size = pageData?.size ?? pageSize;
        this.setTabState(status, {
          records: content.map((item) => this.transformWriteOff(item)),
          loading: false,
          error: null,
          initialized: true,
          currentPage,
          totalPages,
          totalItems,
          pageSize: size,
        });
        this.cdr.detectChanges();
      },
      error: (error) => {
        const message = error?.error?.message || 'Unable to load write-offs.';
        this.setTabState(status, {
          records: [],
          loading: false,
          error: message,
          initialized: true,
          currentPage: 0,
          totalPages: 0,
          totalItems: 0,
          pageSize,
        });
        this.toastr.error(message, 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private loadCustomers(companyId: number, force = false) {
    if (!force && this.customers.length > 0) {
      return;
    }
    this.customersLoading = true;
    this.cdr.detectChanges();
    this.customerService.getCustomers(companyId, 0, 100).subscribe({
      next: (res) => {
        const customerList = res?.data?.content ?? [];
        this.customers = customerList.map((customer) => ({
          id: customer.id,
          name: customer.customerName,
        }));
        this.customersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.customers = [];
        this.customersLoading = false;
        this.toastr.error('Unable to load customers.', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private loadArCodes(force = false, companyIdOverride?: number) {
    if (!force && this.arCodes.length > 0) {
      return;
    }

    const companyId =
      typeof companyIdOverride === 'number' ? companyIdOverride : this.activeCompanyId;

    if (!companyId) {
      if (force) {
        this.toastr.warning('Select a company to load AR codes.', 'Company Required');
      }
      return;
    }

    this.arCodesLoading = true;
    this.cdr.detectChanges();
    this.arCodeService.getCode(companyId).subscribe({
      next: (res) => {
        const codes = res?.data ?? [];
        this.arCodes = codes.map((code) => ({
          id: code.id,
          name: code.name,
        }));
        this.arCodesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.arCodes = [];
        this.arCodesLoading = false;
        this.toastr.error('Unable to load AR codes.', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private resetFormState() {
    this.writeOffForm.reset({
      customerId: '',
      invoiceId: '',
      arCodeId: '',
      reason: '',
    });
    const invoiceControl = this.writeOffForm.controls['invoiceId'];
    invoiceControl.disable({ emitEvent: false });
    this.customerInvoices = [];
    this.invoiceMessage = null;
    this.invoiceMessageIsError = false;
    this.selectedInvoiceId = null;
  }

  private transformWriteOff(entity: WriteOffEntity | any): WriteOffRecord {
    return {
      id: entity.id ?? entity.Id,
      customerName: entity.customerName,
      invoiceNumber: entity.invoiceNumber,
      reason: entity.reason,
      writeOffDate: entity.writeOffDate,
      status: entity.status,
    };
  }

  formatStatus(status: WriteOffStatus | null): string {
    if (!status) return '—';

    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'APPROVED':
        return 'Approved';
      default:
        return status;
    }
  }

  private normalizeCompanyId(value: string | number | null): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  toggleInvoiceSelection(invoiceId: number) {
    const control = this.writeOffForm.controls['invoiceId'];
    if (this.selectedInvoiceId === invoiceId) {
      this.selectedInvoiceId = null;
      control.setValue('');
      return;
    }
    this.selectedInvoiceId = invoiceId;
    control.setValue(invoiceId);
  }

  isInvoiceSelected(invoiceId: number): boolean {
    return this.selectedInvoiceId === invoiceId;
  }

  get selectedInvoiceLabel(): string {
    if (!this.selectedInvoiceId) {
      return '';
    }
    const invoice = this.customerInvoices.find((inv) => inv.id === this.selectedInvoiceId);
    return invoice?.invoiceNumber || String(this.selectedInvoiceId);
  }

  /* ---------------- PAGINATION ---------------- */

  getPageNumbers(tab: WriteOffTab = this.activeTab): number[] {
    const state = this.tabStates[tab];
    const total = state.totalPages;
    const pages: number[] = [];

    if (total <= 0) {
      return pages;
    }

    const current = state.currentPage + 1;

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
    if (!this.activeCompanyId) {
      return;
    }
    const state = this.activeTabState;
    if (page < 0 || page >= state.totalPages || page === state.currentPage) {
      return;
    }
    this.loadWriteOffs(this.activeCompanyId, this.activeTab, page);
  }

  nextPage() {
    if (!this.activeCompanyId) {
      return;
    }
    const state = this.activeTabState;
    if (state.currentPage < state.totalPages - 1) {
      this.loadWriteOffs(this.activeCompanyId, this.activeTab, state.currentPage + 1);
    }
  }

  prevPage() {
    if (!this.activeCompanyId) {
      return;
    }
    const state = this.activeTabState;
    if (state.currentPage > 0) {
      this.loadWriteOffs(this.activeCompanyId, this.activeTab, state.currentPage - 1);
    }
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

    return palette[index % palette.length];
  }

  getInitial(name?: string | null): string {
    if (!name) {
      return 'U';
    }
    const trimmed = name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'U';
  }
}
