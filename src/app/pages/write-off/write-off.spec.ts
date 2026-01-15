import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Customer } from '../../services/customer';
import { ArCodeService } from '../../services/ar-code-service';
import { WriteOffService } from '../../services/write-off-service';
import { UserContextService } from '../../services/user-context.service';

import { WriteOff } from './write-off';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('WriteOff', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    const customerService = {
      getCustomerInvoicesById: createSpy('getCustomerInvoicesById'),
      getCustomers: createSpy('getCustomers'),
    } as unknown as Customer;
    (customerService.getCustomerInvoicesById as any).mockReturnValue(
      of({ data: [{ id: 1, invoiceNumber: 'INV-1' }] })
    );
    (customerService.getCustomers as any).mockReturnValue(of({ data: { content: [] } }));
    const arCodeService = {
      getCode: createSpy('getCode'),
    } as unknown as ArCodeService;
    (arCodeService.getCode as any).mockReturnValue(of({ data: [] }));
    const writeOffService = {
      createWriteOff: createSpy('createWriteOff'),
      approveWriteOff: createSpy('approveWriteOff'),
      getCompanyWriteOff: createSpy('getCompanyWriteOff'),
    } as unknown as WriteOffService;
    (writeOffService.createWriteOff as any).mockReturnValue(of({}));
    (writeOffService.approveWriteOff as any).mockReturnValue(of({}));
    (writeOffService.getCompanyWriteOff as any).mockReturnValue(of({ data: { content: [] } }));
    const userContext = createSpyObj<UserContextService>('UserContextService', ['hasPermission']);
    userContext.hasPermission.mockReturnValue(true);

    const component = new WriteOff(
      fb,
      toastr,
      cdr,
      companySelection,
      customerService,
      arCodeService,
      writeOffService,
      userContext
    );

    return {
      component,
      customerService,
    };
  };

  it('should create', () => {
    const { component } = createComponent();
    expect(component).toBeTruthy();
  });

  it('disables invoice selection when the customer value is invalid', () => {
    const { component } = createComponent();
    const control = component.writeOffForm.controls['invoiceId'];
    control.enable();

    component.handleCustomerSelection(null);

    expect(control.disabled).toBe(true);
    expect(component.selectedInvoiceId).toBeNull();
  });

  it('loads invoices when a valid customer is selected', () => {
    const { component, customerService } = createComponent();
    const control = component.writeOffForm.controls['invoiceId'];

    component.handleCustomerSelection('27');

    expect(control.disabled).toBe(false);
    expect(customerService.getCustomerInvoicesById).toHaveBeenCalledWith(27);
  });

  it('toggles invoice selections and syncs the reactive control', () => {
    const { component } = createComponent();
    const control = component.writeOffForm.controls['invoiceId'];
    control.enable();

    component.toggleInvoiceSelection(91);
    expect(component.isInvoiceSelected(91)).toBe(true);
    expect(control.value).toBe(91);

    component.toggleInvoiceSelection(91);
    expect(component.isInvoiceSelected(91)).toBe(false);
    expect(control.value).toBe('');
  });

  it('formats statuses into readable labels', () => {
    const { component } = createComponent();

    expect(component.formatStatus('DRAFT')).toBe('Draft');
    expect(component.formatStatus('APPROVED')).toBe('Approved');
    expect(component.formatStatus(null)).toBe('—');
  });
});
