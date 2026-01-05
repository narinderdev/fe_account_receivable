import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Customer } from '../../../services/customer';
import { ToastrService } from 'ngx-toastr';
import { InvoiceService } from '../../../services/invoice-service';
import { PaymentService } from '../../../services/payment-service';
import { CompanySelectionService } from '../../../services/company-selection.service';
import { Subject } from 'rxjs';

import { ReceivePayment } from './receive-payment';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('ReceivePayment', () => {
  const createComponent = () => {
    const customerService = createSpyObj<Customer>('Customer', ['getCustomers']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const invoiceService = createSpyObj<InvoiceService>('InvoiceService', ['getUnpaidInvoices']);
    const paymentService = createSpyObj<PaymentService>('PaymentService', ['applyPayment']);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    return new ReceivePayment(
      customerService,
      cdr,
      toastr,
      invoiceService,
      paymentService,
      router,
      companySelection
    );
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('form logic', () => {
    it('validates required fields before applying payment', () => {
      const instance = createComponent();
      instance.amount = null;
      instance.paymentMethod = '';
      instance.notes = '';
      instance.invoices = [];
      expect(instance.isFormValid()).toBe(false);
      expect(instance.showAmountError).toBe(true);
      expect(instance.showPaymentMethodError).toBe(true);
      expect(instance.showNotesError).toBe(true);
    });

    it('totals the applied amount across selected invoices', () => {
      const instance = createComponent();
      instance.invoices = [
        { appliedAmount: 25, selected: true },
        { appliedAmount: 10, selected: true },
        { appliedAmount: 5, selected: false },
      ] as any;
      expect(instance.totalApplied).toBe(40);
    });
  });
});
