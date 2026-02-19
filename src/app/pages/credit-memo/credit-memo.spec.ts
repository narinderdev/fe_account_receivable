import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { InvoiceService } from '../../services/invoice-service';
import { Customer } from '../../services/customer';
import { CompanySelectionService } from '../../services/company-selection.service';
import { ArCodeService } from '../../services/ar-code-service';
import { CreditMemoService } from '../../services/credit-memo-service';
import { UserContextService } from '../../services/user-context.service';
import { Router } from '@angular/router';

import { CreditMemo } from './credit-memo';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';
import { CreateCreditMemoPayload } from '../../models/credit-memo.model';

describe('CreditMemo', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const userContext = createSpyObj<UserContextService>('UserContextService', [
      'hasPermission',
      'getUserId',
    ]);
    userContext.hasPermission.mockReturnValue(true);
    userContext.getUserId.mockReturnValue(101);

    const invoiceService = {
      getCustomerInvoicesById: createSpy('getCustomerInvoicesById'),
    } as unknown as InvoiceService;
    (invoiceService.getCustomerInvoicesById as any).mockReturnValue(of({ data: [] }));

    const customerService = {
      getCustomers: createSpy('getCustomers'),
    } as unknown as Customer;
    (customerService.getCustomers as any).mockReturnValue(of({ data: { content: [] } }));

    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
      getSelectedCompanyId: createSpy('getSelectedCompanyId'),
    } as unknown as CompanySelectionService;
    (companySelection.getSelectedCompanyId as any).mockReturnValue(1);

    const arCodeService = {
      getCode: createSpy('getCode'),
    } as unknown as ArCodeService;
    (arCodeService.getCode as any).mockReturnValue(of({ data: [] }));

    const creditMemoService = {
      getCompanyCreditMemos: createSpy('getCompanyCreditMemos'),
      createMemo: createSpy('createMemo'),
      approveCreditMemo: createSpy('approveCreditMemo'),
    } as unknown as CreditMemoService;
    (creditMemoService.getCompanyCreditMemos as any).mockReturnValue(of({ data: { content: [] } }));
    (creditMemoService.createMemo as any).mockReturnValue(of({}));
    (creditMemoService.approveCreditMemo as any).mockReturnValue(of({}));

    const router = createSpyObj<Router>('Router', ['navigate']);

    const component = new CreditMemo(
      fb,
      toastr,
      cdr,
      userContext,
      invoiceService,
      customerService,
      companySelection,
      arCodeService,
      creditMemoService,
      router
    );

    return {
      component,
      invoiceService,
      creditMemoService,
    };
  };

  it('should create', () => {
    const { component } = createComponent();
    expect(component).toBeTruthy();
  });

  it('fetches invoices when apply-to-invoice is toggled on', () => {
    const { component, invoiceService } = createComponent();
    component.creditMemoForm.controls['customerId'].setValue('15');
    component.selectedInvoiceIds = [3, 4];

    component.creditMemoForm.controls['applyToInvoiceNow'].setValue(true);

    expect(invoiceService.getCustomerInvoicesById).toHaveBeenCalledWith(15);
    expect(component.selectedInvoiceIds).toEqual([]);
  });

  it('clears invoice data when apply-to-invoice is toggled off', () => {
    const { component } = createComponent();
    component.customerInvoices = [{ id: 1 } as any];
    component.invoiceMessage = 'Loaded';
    component.invoiceMessageIsError = true;
    component.selectedInvoiceIds = [5];
    const internals = component as unknown as CreditMemoInternals;

    internals.handleApplyToInvoiceToggle(false);

    expect(component.customerInvoices).toEqual([]);
    expect(component.invoiceMessage).toBeNull();
    expect(component.selectedInvoiceIds).toEqual([]);
  });

  it('builds payload with invoice id when a memo is being applied immediately', () => {
    const { component, creditMemoService } = createComponent();
    component.creditMemoForm.patchValue({
      customerId: '10',
      amount: '105.5',
      arCodeId: '7',
      creditMemoDate: '2024-01-01',
      applyToInvoiceNow: false,
      linkReferenceInvoice: false,
    });
    component.creditMemoForm.controls['applyToInvoiceNow'].setValue(true, { emitEvent: false });
    component.selectedInvoiceIds = [55];

    component.saveCreditMemo();

    expect(creditMemoService.createMemo).toHaveBeenCalled();
    const payload = (creditMemoService.createMemo as any).mock.calls[0][0] as CreateCreditMemoPayload;
    expect(payload.invoiceId).toBe(55);
    expect(payload.creditReason).toBe('Credit memo applied to invoice');
    expect(payload.amount).toBe(105.5);
  });

  it('uses on-account reason when no invoice is selected', () => {
    const { component, creditMemoService } = createComponent();
    component.creditMemoForm.patchValue({
      customerId: '10',
      amount: '20',
      arCodeId: '3',
      creditMemoDate: '2024-01-01',
      applyToInvoiceNow: false,
      linkReferenceInvoice: false,
    });
    component.creditMemoForm.controls['applyToInvoiceNow'].setValue(true, { emitEvent: false });
    component.selectedInvoiceIds = [];

    component.saveCreditMemo();

    expect(creditMemoService.createMemo).toHaveBeenCalled();
    const payload = (creditMemoService.createMemo as any).mock.calls[0][0] as CreateCreditMemoPayload;
    expect(payload.invoiceId).toBeUndefined();
    expect(payload.creditReason).toBe('Manual credit memo');
  });

  it('maps statuses to the correct tab', () => {
    const { component } = createComponent();
    const internals = component as unknown as CreditMemoInternals;

    expect(internals.mapStatusToTab('DRAFTED')).toBe('CREATED');
    expect(internals.mapStatusToTab('APPROVED')).toBe('APPROVED');
    expect(internals.mapStatusToTab('POSTED')).toBe('APPROVED');
    expect(internals.mapStatusToTab('ALLOWED')).toBe('APPROVED');
    expect(internals.mapStatusToTab(undefined)).toBe('CREATED');
  });

  it('toggles invoice selection state', () => {
    const { component } = createComponent();

    component.toggleInvoiceSelection(9);
    expect(component.isInvoiceSelected(9)).toBe(true);

    component.toggleInvoiceSelection(9);
    expect(component.isInvoiceSelected(9)).toBe(false);
  });
});

type CreditMemoInternals = {
  handleApplyToInvoiceToggle(applyNow: boolean): void;
  mapStatusToTab(status?: string | null): 'CREATED' | 'APPROVED';
};
