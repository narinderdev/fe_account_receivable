import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Customer } from '../../../services/customer';
import { ToastrService } from 'ngx-toastr';
import { InvoiceService } from '../../../services/invoice-service';
import { PaymentService } from '../../../services/payment-service';
import { CompanySelectionService } from '../../../services/company-selection.service';
import { Subject } from 'rxjs';

import { ReceivePayment } from './receive-payment';
import { Invoice } from '../../../models/invoice.model';
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
      companySelection,
    );
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('form logic', () => {
    it('validates required fields before applying payment', () => {
      const instance = createComponent();
      instance.selectedCustomerId = null;
      instance.bankDeposit = null;
      instance.serviceFee = null;
      instance.paymentMethod = '';
      instance.notes = '   ';
      instance.invoices = [];

      expect(instance.isFormValid()).toBe(false);
      expect(instance.showCustomerError).toBe(true);
      expect(instance.showBankDepositError).toBe(true);
      expect(instance.showServiceFeeError).toBe(false); // Service fee is optional
      expect(instance.showPaymentMethodError).toBe(true);
      expect(instance.showInvoiceError).toBe(true);
      expect(instance.showNotesError).toBe(true);
    });

    it('validates service fee only if provided and ensures non-negative', () => {
      const instance = createComponent();

      // Service fee is null - should be valid
      instance.serviceFee = null;
      instance.selectedCustomerId = 1;
      instance.bankDeposit = 100;
      instance.paymentMethod = 'CASH';
      instance.notes = 'Test';
      instance.invoices = [createInvoice({ selected: true })];
      expect(instance.isFormValid()).toBe(true);
      expect(instance.showServiceFeeError).toBe(false);

      // Service fee is negative - should be invalid
      instance.serviceFee = -10;
      expect(instance.isFormValid()).toBe(false);
      expect(instance.showServiceFeeError).toBe(true);

      // Service fee is 0 - should be valid
      instance.serviceFee = 0;
      expect(instance.isFormValid()).toBe(true);
      expect(instance.showServiceFeeError).toBe(false);

      // Service fee is positive - should be valid
      instance.serviceFee = 25;
      expect(instance.isFormValid()).toBe(true);
      expect(instance.showServiceFeeError).toBe(false);
    });

    it('calculates total amount from bank deposit only', () => {
      const instance = createComponent();
      instance.bankDeposit = 100;
      instance.serviceFee = 25;
      expect(instance.totalAmount).toBe(100); // Service fee not included

      instance.serviceFee = null;
      expect(instance.totalAmount).toBe(100); // Still works with null service fee

      instance.serviceFee = 0;
      expect(instance.totalAmount).toBe(100); // Still works with 0 service fee
    });

    it('totals the applied amount across selected invoices', () => {
      const instance = createComponent();
      instance.invoices = [
        createInvoice({ appliedAmount: 25, selected: true }),
        createInvoice({ appliedAmount: 10, selected: true }),
        createInvoice({ appliedAmount: 5, selected: false }),
      ];
      expect(instance.totalApplied).toBe(40);
    });

    it('calculates unapplied amount correctly', () => {
      const instance = createComponent();
      instance.bankDeposit = 100;
      instance.serviceFee = 25;
      instance.invoices = [createInvoice({ appliedAmount: 60, selected: true })];

      // Total is 100 (bank deposit only), applied is 60
      expect(instance.unappliedAmount).toBe(40);
    });
  });
});

type TestSelectableInvoice = Invoice & {
  selected?: boolean;
  appliedAmount?: number;
};

function createInvoice(overrides: Partial<TestSelectableInvoice> = {}): TestSelectableInvoice {
  return {
    id: 1,
    invoiceNumber: 'INV-1',
    invoiceDate: '2024-01-01',
    dueDate: '2024-01-31',
    subTotal: 100,
    taxAmount: 10,
    totalAmount: 110,
    description: null,
    balanceDue: 0,
    status: 'OPEN',
    lastPaymentDate: null,
    note: null,
    generated: false,
    active: true,
    deleted: false,
    customer: {
      id: 1,
      customerId: 1,
      customerName: 'Acme',
      customerType: 'Business',
      email: 'acme@example.com',
      phoneNumber: null,
      deleted: false,
      address: null,
      cashApplication: null,
      dunning: null,
      eft: null,
      statement: null,
      vat: null,
    },
    selected: false,
    appliedAmount: 0,
    ...overrides,
  };
}
