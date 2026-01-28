import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Customer } from '../../services/customer';
import { InvoiceService } from '../../services/invoice-service';
import { ToastrService } from 'ngx-toastr';
import { CompanySelectionService } from '../../services/company-selection.service';
import { CustomerEntity, Dunning } from '../../models/customer.model';

import { CreateInvoice } from './create-invoice';
import { Subject } from 'rxjs';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('CreateInvoice', () => {
  const createComponent = () => {
    const customerService = createSpyObj<Customer>('Customer', ['getCustomers']);
    const invoiceService = createSpyObj<InvoiceService>('InvoiceService', [
      'createInvoice',
      'sendInvoice',
    ]);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;

    return new CreateInvoice(
      customerService,
      invoiceService,
      router,
      cdr,
      toastr,
      companySelection,
    );
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('amount calculations', () => {
    it('computes subtotal, tax and total correctly', () => {
      const instance = createComponent();
      instance.invoice.items = [
        {
          itemName: 'Item 1',
          description: '',
          quantity: '2',
          rate: '100',
          rateDisplay: '100',
          tax: '10',
        },
        {
          itemName: 'Item 2',
          description: '',
          quantity: '1',
          rate: '50',
          rateDisplay: '50',
          tax: '0',
        },
      ];
      expect(instance.subtotal).toBe(250);
      expect(instance.taxAmount).toBe(20);
      expect(instance.totalAmount).toBe(270);
    });

    it('detects when the invoice exceeds the customer credit limit', () => {
      const instance = createComponent();
      instance.selectedCustomer = createCustomerStub({
        dunning: createDunning({ creditLimit: 100 }),
      });
      instance.invoice.items = [
        {
          itemName: 'Item',
          description: '',
          quantity: '1',
          rate: '150',
          rateDisplay: '150',
          tax: '0',
        },
      ];
      expect(instance.exceedsCreditLimit).toBe(true);
    });
  });
});

function createCustomerStub(overrides: Partial<CustomerEntity> = {}): CustomerEntity {
  const merged = {
    id: 1,
    customerId: 1,
    customerName: 'Acme',
    customerType: 'Business',
    email: 'acme@example.com',
    deleted: false,
    address: null,
    cashApplication: null,
    dunning: createDunning(),
    eft: null,
    statement: null,
    vat: null,
    ...overrides,
  };
  return merged;
}

function createDunning(overrides: Partial<Dunning> = {}): Dunning {
  return {
    id: 1,
    creditLimit: 0,
    dunningLevel: '',
    level1: '',
    level2: '',
    level3: '',
    level4: '',
    pastDue: '',
    paymentTerms: '',
    placeOnCreditHold: false,
    ...overrides,
  };
}
