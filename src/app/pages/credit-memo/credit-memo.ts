import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import { UserContextService } from '../../services/user-context.service';
import { InvoiceService } from '../../services/invoice-service';
import { InvoiceWithItems } from '../../models/invoice.model';
import { Customer as CustomerService } from '../../services/customer';
import { CompanySelectionService } from '../../services/company-selection.service';
import { ArCodeService } from '../../services/ar-code-service';
import { CreditMemoService } from '../../services/credit-memo-service';
import { CreditMemoEntity, CreateCreditMemoPayload } from '../../models/credit-memo.model';
import { Subject, takeUntil } from 'rxjs';

type CreditMemoStatus = string;

interface CreditMemoRecord {
  id?: number;
  creditMemoNo?: string | null;
  customerId?: number;
  customerName?: string;
  amount: number;
  appliedAmount?: number;
  arCodeId?: number;
  arCodeName?: string;
  date?: string | Date | null;
  status: CreditMemoStatus;
  linkedInvoiceId?: number;
  currency?: string | null;
}

interface CustomerOption {
  id: number;
  name: string;
}

interface ArCodeOption {
  id: number;
  name: string;
  code: string;
}

const CREDIT_MEMO_CURRENCY = 'USD';
const CREDIT_REASON_ON_ACCOUNT = 'Manual credit memo';
const CREDIT_REASON_APPLIED = 'Credit memo applied to invoice';

@Component({
  selector: 'app-credit-memo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Loader, Spinner],
  templateUrl: './credit-memo.html',
  styleUrl: './credit-memo.css',
})
export class CreditMemo implements OnInit, OnDestroy {
  records: CreditMemoRecord[] = [];
  customers: CustomerOption[] = [];
  arCodes: ArCodeOption[] = [];
  creditMemoForm: FormGroup;
  applyForm: FormGroup;
  modalOpen = false;
  applyModalOpen = false;
  submitted = false;
  applySubmitted = false;
  editingRecordIndex: number | null = null;
  applyingRecordIndex: number | null = null;
  applyingRecord: CreditMemoRecord | null = null;
  saving = false;
  applying = false;
  loading = true;
  deleteModalOpen = false;
  deleteTargetIndex: number | null = null;
  deleting = false;
  canViewCreditMemos = false;
  canCreateCreditMemo = false;
  canUpdateCreditMemo = false;
  canDeleteCreditMemo = false;
  canApplyCreditMemo = false;
  showActionsColumn = false;
  activeMenuIndex: number | null = null;
  customerInvoices: InvoiceWithItems[] = [];
  selectedInvoiceIds: number[] = [];
  invoicesLoading = false;
  invoiceMessage: string | null = null;
  invoiceMessageIsError = false;
  customersLoading = false;
  arCodesLoading = false;
  creditMemosError: string | null = null;
  private deletingMemoIds = new Set<number>();
  private destroy$ = new Subject<void>();
  private lastCompanyId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private userContext: UserContextService,
    private invoiceService: InvoiceService,
    private customerService: CustomerService,
    private companySelection: CompanySelectionService,
    private arCodeService: ArCodeService,
    private creditMemoService: CreditMemoService
  ) {
    this.canViewCreditMemos = this.userContext.hasPermission('VIEW_CREDIT_MEMO');
    this.canCreateCreditMemo = this.userContext.hasPermission('CREATE_CREDIT_MEMO');
    this.canUpdateCreditMemo = this.userContext.hasPermission('UPDATE_CREDIT_MEMO');
    this.canDeleteCreditMemo = this.userContext.hasPermission('DELETE_CREDIT_MEMO');
    this.canApplyCreditMemo = this.userContext.hasPermission('APPLY_CREDIT_MEMO');
    this.showActionsColumn = this.canUpdateCreditMemo || this.canDeleteCreditMemo || this.canApplyCreditMemo;

    this.creditMemoForm = this.fb.group({
      customerId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      arCodeId: ['', Validators.required],
      applyToInvoiceNow: [false],
    });

    this.creditMemoForm.controls['applyToInvoiceNow'].valueChanges.subscribe((applyNow: boolean) => {
      this.handleApplyToInvoiceToggle(Boolean(applyNow));
    });

    this.applyForm = this.fb.group({
      applyAmount: ['', [Validators.required, Validators.min(0.01)]],
    });
  }

  ngOnInit() {
    if (!this.canViewCreditMemos) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }
    this.subscribeToCompanySelection();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToCompanySelection() {
    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((companyIdValue) => {
        const companyId = this.normalizeCompanyId(companyIdValue);
        if (companyId === this.lastCompanyId) {
          return;
        }

        if (companyId === null) {
          this.lastCompanyId = null;
          this.records = [];
          this.creditMemosError = 'Select a company to view credit memos.';
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        this.lastCompanyId = companyId;
        this.fetchInitialData(companyId);
      });
  }

  private fetchInitialData(companyId: number) {
    this.loadCustomersFromService(true, companyId);
    this.loadArCodesFromService();
    this.loadCompanyCreditMemos(companyId);
  }

  private normalizeCompanyId(value: string | number | null | undefined): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private getSelectedCompanyId(): number | null {
    return this.normalizeCompanyId(this.companySelection.getSelectedCompanyId());
  }

  private loadCustomersFromService(force = false, companyIdOverride?: number) {
    if (!force && this.customers.length > 0) {
      return;
    }

    const companyId =
      typeof companyIdOverride === 'number' ? companyIdOverride : this.getSelectedCompanyId();

    if (companyId === null) {
      this.customers = [];
      if (force) {
        this.toastr.warning('Select a company to load customers.', 'Company Required');
      }
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
        this.customersLoading = false;
        this.customers = [];
        this.toastr.error('Unable to load customers.', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private loadArCodesFromService(force = false) {
    if (!force && this.arCodes.length > 0) {
      return;
    }

    const userId = this.userContext.getUserId();
    if (!userId) {
      this.arCodes = [];
      if (force) {
        this.toastr.warning('User information missing. Unable to load AR codes.', 'Warning');
      }
      return;
    }

    this.arCodesLoading = true;
    this.cdr.detectChanges();

    this.arCodeService.getCode(userId).subscribe({
      next: (res) => {
        const arCodes = res?.data ?? [];
        this.arCodes = arCodes.map((code) => ({
          id: code.id,
          name: code.name,
          code: code.code,
        }));
        this.arCodesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.arCodesLoading = false;
        this.arCodes = [];
        this.toastr.error('Unable to load AR codes.', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private loadCompanyCreditMemos(companyIdOverride?: number) {
    const companyId =
      typeof companyIdOverride === 'number' ? companyIdOverride : this.getSelectedCompanyId();

    if (companyId === null) {
      this.records = [];
      this.creditMemosError = 'Select a company to view credit memos.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.creditMemosError = null;
    this.cdr.detectChanges();

    this.creditMemoService.getCompanyCreditMemos(companyId, 0, 10).subscribe({
      next: (response) => {
        const content = response?.data?.content ?? [];
        this.records = content.map((memo) => this.transformCreditMemo(memo));
        this.loading = false;
        this.creditMemosError = null;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.records = [];
        this.loading = false;
        this.creditMemosError =
          error?.error?.message || 'Unable to load credit memos.';
        this.toastr.error(this.creditMemosError || 'Unable to load credit memos.', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private transformCreditMemo(memo: CreditMemoEntity): CreditMemoRecord {
    return {
      id: memo.id,
      creditMemoNo: memo.creditMemoNo ?? '',
      customerId: memo.customer?.id ?? undefined,
      customerName: memo.customer?.customerName ?? 'Unknown',
      amount: memo.amount,
      appliedAmount: memo.appliedAmount ?? 0,
      arCodeId: memo.arCode?.id ?? undefined,
      arCodeName: memo.arCode?.name ?? memo.arCode?.code ?? '',
      date: memo.postingDate ?? memo.createdAt ?? null,
      status: memo.status ?? 'Unknown',
      linkedInvoiceId: memo.targetInvoiceId ?? undefined,
      currency: memo.currency ?? null,
    };
  }

  private resetCreditMemoFormState() {
    this.creditMemoForm.reset({
      customerId: '',
      amount: '',
      arCodeId: '',
      applyToInvoiceNow: false,
    });

    this.customerInvoices = [];
    this.selectedInvoiceIds = [];
    this.invoicesLoading = false;
    this.invoiceMessage = null;
    this.invoiceMessageIsError = false;
  }

  handleCustomerSelection(customerIdValue: string | number | null) {
    const customerId = Number(customerIdValue);
    this.customerInvoices = [];
    this.selectedInvoiceIds = [];
    this.invoiceMessage = null;
    this.invoiceMessageIsError = false;

    if (!Number.isFinite(customerId) || customerId <= 0) {
      this.invoicesLoading = false;
      return;
    }

    const applyToInvoiceNow = this.creditMemoForm.controls['applyToInvoiceNow'].value;
    if (applyToInvoiceNow) {
      this.fetchCustomerInvoices(customerId);
    }
  }

  private handleApplyToInvoiceToggle(applyNow: boolean) {
    this.selectedInvoiceIds = [];
    
    if (applyNow) {
      const customerId = Number(this.creditMemoForm.controls['customerId'].value);
      if (customerId) {
        this.fetchCustomerInvoices(customerId);
      }
    } else {
      this.customerInvoices = [];
      this.invoiceMessage = null;
    }
  }

  private fetchCustomerInvoices(customerId: number) {
    if (!customerId || Number.isNaN(customerId)) {
      return;
    }

    this.invoicesLoading = true;
    this.invoiceMessage = null;
    this.invoiceMessageIsError = false;
    this.cdr.detectChanges();

    this.invoiceService.getCustomerInvoicesById(customerId).subscribe({
      next: (response) => {
        this.customerInvoices = response?.data ?? [];
        this.invoicesLoading = false;
        if (this.customerInvoices.length === 0) {
          this.invoiceMessage = 'No invoices found for this customer. Credit will remain on-account.';
          this.invoiceMessageIsError = false;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.customerInvoices = [];
        this.invoicesLoading = false;
        this.invoiceMessage = 'Unable to load invoices for this customer.';
        this.invoiceMessageIsError = true;
        this.toastr.error('Unable to load invoices for this customer.', 'Error');
        this.cdr.detectChanges();
      }
    });
  }

  toggleInvoiceSelection(invoiceId: number) {
    const index = this.selectedInvoiceIds.indexOf(invoiceId);
    if (index > -1) {
      this.selectedInvoiceIds.splice(index, 1);
    } else {
      this.selectedInvoiceIds.push(invoiceId);
    }
  }

  isInvoiceSelected(invoiceId: number): boolean {
    return this.selectedInvoiceIds.includes(invoiceId);
  }

  openModal() {
    if (!this.canCreateCreditMemo) {
      return;
    }
    this.loadCustomersFromService(true);
    this.loadArCodesFromService(true);
    
    this.resetCreditMemoFormState();
    this.submitted = false;
    this.editingRecordIndex = null;
    this.saving = false;
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.modalOpen = false;
    this.submitted = false;
    this.editingRecordIndex = null;
    this.saving = false;
    this.resetCreditMemoFormState();
    this.cdr.detectChanges();
  }

  openApplyModal(index: number) {
    if (!this.canApplyCreditMemo) {
      return;
    }
    const record = this.records[index];
    if (!record) {
      return;
    }
    this.applyingRecordIndex = index;
    this.applyingRecord = record;
    this.applyForm.reset();
    
    const appliedAmount = Number(record.appliedAmount || 0);
    const availableAmount = record.amount - appliedAmount;
    this.applyForm.controls['applyAmount'].setValidators([
      Validators.required,
      Validators.min(0.01),
      Validators.max(availableAmount)
    ]);
    this.applyForm.controls['applyAmount'].updateValueAndValidity();
    
    this.applySubmitted = false;
    this.applying = false;
    this.applyModalOpen = true;
    this.cdr.detectChanges();
  }

  closeApplyModal() {
    this.applyModalOpen = false;
    this.applySubmitted = false;
    this.applyingRecordIndex = null;
    this.applyingRecord = null;
    this.applying = false;
    this.cdr.detectChanges();
  }

  getAvailableAmount(): number {
    if (!this.applyingRecord) {
      return 0;
    }
    const appliedAmount = Number(this.applyingRecord.appliedAmount || 0);
    return this.applyingRecord.amount - appliedAmount;
  }

  applyCreditMemo() {
    this.applySubmitted = true;
    if (this.applyForm.invalid || this.applying || !this.applyingRecord) {
      return;
    }

    if (!this.canApplyCreditMemo) {
      this.toastr.error('You do not have permission to apply credit memos.', 'Permission denied');
      return;
    }

    if (!this.applyingRecord.id) {
      this.toastr.error(
        'Unable to apply this credit memo. Please refresh the page and try again.',
        'Error'
      );
      return;
    }

    const applyAmount = Number(this.applyForm.value.applyAmount);

    this.applying = true;
    
    setTimeout(() => {
      const recordIndex = this.records.findIndex(r => r.id === this.applyingRecord!.id);
      if (recordIndex !== -1) {
        const targetRecord = this.records[recordIndex];
        const currentApplied = Number(targetRecord.appliedAmount || 0);
        targetRecord.appliedAmount = currentApplied + applyAmount;
        this.records[recordIndex] = { ...targetRecord };
        this.toastr.success('Credit memo applied successfully', 'Success');
      }
      
      this.applying = false;
      this.closeApplyModal();
      this.cdr.detectChanges();
    }, 500);
  }

  saveCreditMemo() {
    this.submitted = true;
    if (this.creditMemoForm.invalid || this.saving) {
      return;
    }

    const formValue = this.creditMemoForm.getRawValue();
    const applyToInvoiceNow = Boolean(formValue.applyToInvoiceNow);
    const editingRecord =
      this.editingRecordIndex !== null ? this.records[this.editingRecordIndex] : null;

    this.saving = true;
    this.cdr.detectChanges();

    if (this.editingRecordIndex !== null && editingRecord) {
      this.updateExistingCreditMemo(editingRecord, formValue);
      return;
    }

    this.createCreditMemoOnServer(formValue, applyToInvoiceNow);
  }

  private updateExistingCreditMemo(
    editingRecord: CreditMemoRecord,
    formValue: Record<string, unknown>
  ) {
    if (!this.canUpdateCreditMemo) {
      this.toastr.error('You do not have permission to update credit memos.', 'Permission denied');
      this.saving = false;
      this.cdr.detectChanges();
      return;
    }

    setTimeout(() => {
      if (this.editingRecordIndex === null) {
        this.saving = false;
        this.cdr.detectChanges();
        return;
      }

      const customer = this.customers.find((c) => c.id === Number(formValue['customerId']));
      const arCode = this.arCodes.find((ac) => ac.id === Number(formValue['arCodeId']));

      this.records[this.editingRecordIndex] = {
        ...editingRecord,
        customerId: Number(formValue['customerId']),
        customerName: customer?.name || 'Unknown',
        amount: Number(formValue['amount']),
        arCodeId: Number(formValue['arCodeId']),
        arCodeName: arCode?.name,
      };

      this.toastr.success('Credit memo updated successfully', 'Success');
      this.closeModal();
      this.cdr.detectChanges();
    }, 500);
  }

  private createCreditMemoOnServer(
    formValue: Record<string, unknown>,
    applyToInvoiceNow: boolean
  ) {
    if (!this.canCreateCreditMemo) {
      this.toastr.error('You do not have permission to create credit memos.', 'Permission denied');
      this.saving = false;
      this.cdr.detectChanges();
      return;
    }

    const customerId = Number(formValue['customerId']);
    if (!Number.isFinite(customerId) || customerId <= 0) {
      this.toastr.error('Select a valid customer before saving.', 'Error');
      this.saving = false;
      this.cdr.detectChanges();
      return;
    }

    const payload = this.buildCreateMemoPayload(formValue, applyToInvoiceNow);

    this.creditMemoService
      .createMemo(payload, customerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const createdMemo = response?.data ? this.transformCreditMemo(response.data) : null;
          if (createdMemo) {
            this.records = [createdMemo, ...this.records];
          } else {
            this.loadCompanyCreditMemos();
          }

          let message = response?.message || 'Credit memo created successfully';
          // if (payload.invoiceId) {
          //   message += ' Credit memo applied to the selected invoice.';
          // } else if (applyToInvoiceNow) {
          //   message += ' No invoice was selected, so the credit remains on-account.';
          // }

          this.toastr.success(message, 'Success');
          this.closeModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          const message = error?.error?.message || 'Unable to create credit memo.';
          this.toastr.error(message, 'Error');
          this.saving = false;
          this.cdr.detectChanges();
        },
      });
  }

  private buildCreateMemoPayload(
    formValue: Record<string, unknown>,
    applyToInvoiceNow: boolean
  ): CreateCreditMemoPayload {
    const amount = Number(formValue['amount']);
    const arCodeId = Number(formValue['arCodeId']);
    const invoiceId =
      applyToInvoiceNow && this.selectedInvoiceIds.length > 0
        ? this.selectedInvoiceIds[0]
        : undefined; // API currently supports linking a single invoice per memo.

    const payload: CreateCreditMemoPayload = {
      creditReason: invoiceId ? CREDIT_REASON_APPLIED : CREDIT_REASON_ON_ACCOUNT,
      amount,
      currency: CREDIT_MEMO_CURRENCY,
      arCodeId,
    };

    if (typeof invoiceId === 'number') {
      payload.invoiceId = invoiceId;
    }

    return payload;
  }

  editCreditMemo(index: number) {
    if (!this.canUpdateCreditMemo) {
      return;
    }
    const record = this.records[index];
    if (!record) {
      return;
    }
    
    this.loadCustomersFromService(true);
    this.loadArCodesFromService(true);
    
    this.resetCreditMemoFormState();
    this.editingRecordIndex = index;
    this.creditMemoForm.patchValue({
      customerId: record.customerId,
      amount: record.amount,
      arCodeId: record.arCodeId,
    });
    if (record.customerId) {
      this.handleCustomerSelection(record.customerId);
    }
    this.submitted = false;
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  openDeleteModal(index: number) {
    if (!this.canDeleteCreditMemo) {
      return;
    }
    const record = this.records[index];
    if (!record) {
      return;
    }
    this.deleteTargetIndex = index;
    this.deleteModalOpen = true;
    this.deleting = false;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.deleteModalOpen = false;
    this.deleteTargetIndex = null;
    this.deleting = false;
    this.cdr.detectChanges();
  }

  confirmDelete() {
    if (this.deleteTargetIndex === null) {
      return;
    }
    const record = this.records[this.deleteTargetIndex];
    if (!record) {
      this.closeDeleteModal();
      return;
    }

    if (!this.canDeleteCreditMemo) {
      this.toastr.error('You do not have permission to delete credit memos.', 'Permission denied');
      this.closeDeleteModal();
      return;
    }

    this.performDelete(record, this.deleteTargetIndex);
  }

  private performDelete(record: CreditMemoRecord, index: number) {
    if (!record.id) {
      const nextRecords = [...this.records];
      nextRecords.splice(index, 1);
      this.records = nextRecords;
      if (this.editingRecordIndex !== null) {
        if (index === this.editingRecordIndex) {
          this.closeModal();
        } else if (index < this.editingRecordIndex) {
          this.editingRecordIndex = this.editingRecordIndex - 1;
        }
      }
      this.toastr.success('Credit memo deleted successfully', 'Success');
      this.closeDeleteModal();
      this.cdr.detectChanges();
      return;
    }

    if (this.deletingMemoIds.has(record.id)) {
      return;
    }

    this.deleting = true;
    this.deletingMemoIds.add(record.id);
    this.cdr.detectChanges();

    const editingRecordId =
      this.editingRecordIndex !== null ? this.records[this.editingRecordIndex]?.id : null;

    setTimeout(() => {
      this.records = this.records.filter(r => r.id !== record.id);
      
      if (editingRecordId === record.id) {
        this.closeModal();
      }
      
      this.toastr.success('Credit memo deleted successfully', 'Success');
      this.deleting = false;
      this.deletingMemoIds.delete(record.id as number);
      this.closeDeleteModal();
      this.cdr.detectChanges();
    }, 500);
  }

  toggleActionMenu(index: number, event: Event) {
    event.stopPropagation();
    this.activeMenuIndex = this.activeMenuIndex === index ? null : index;
    this.cdr.detectChanges();
  }

  closeActionMenu() {
    this.activeMenuIndex = null;
    this.cdr.detectChanges();
  }

  getStatusLabel(status: CreditMemoStatus): string {
    if (!status) {
      return 'Unknown';
    }
    const normalized = String(status).toUpperCase();
    switch (normalized) {
      case 'DRAFTED':
        return 'Draft';
      case 'POSTED':
        return 'Posted';
      case 'ALLOWED':
        return 'Allowed';
      default:
        return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
    }
  }

  isDeleting(memoId?: number): boolean {
    return typeof memoId === 'number' && this.deletingMemoIds.has(memoId);
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
