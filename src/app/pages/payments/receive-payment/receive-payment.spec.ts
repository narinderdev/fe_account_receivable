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
      instance.selectedCustomerId = null;
      instance.bankDeposit = null;
      instance.serviceFee = null;
      instance.paymentMethod = '';
      instance.notes = '   ';
      instance.invoices = [];

      expect(instance.isFormValid()).toBe(false);
      expect(instance.showCustomerError).toBe(true);
      expect(instance.showBankDepositError).toBe(true);
      expect(instance.showServiceFeeError).toBe(true);
      expect(instance.showPaymentMethodError).toBe(true);
      expect(instance.showInvoiceError).toBe(true);
      expect(instance.showNotesError).toBe(true);
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
