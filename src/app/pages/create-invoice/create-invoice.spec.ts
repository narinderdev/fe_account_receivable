import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Customer } from '../../services/customer';
import { InvoiceService } from '../../services/invoice-service';
import { ToastrService } from 'ngx-toastr';
import { CompanySelectionService } from '../../services/company-selection.service';

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

    return new CreateInvoice(customerService, invoiceService, router, cdr, toastr, companySelection);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('amount calculations', () => {
    it('computes subtotal, tax and total correctly', () => {
      const instance = createComponent();
      instance.invoice.items = [
        { itemName: 'Item 1', description: '', quantity: 2, rate: 100, tax: 10 },
        { itemName: 'Item 2', description: '', quantity: 1, rate: 50, tax: 0 },
      ];
      expect(instance.subtotal).toBe(250);
      expect(instance.taxAmount).toBe(20);
      expect(instance.totalAmount).toBe(270);
    });

    it('detects when the invoice exceeds the customer credit limit', () => {
      const instance = createComponent();
      instance.selectedCustomer = { dunning: { creditLimit: 100 } } as any;
      instance.invoice.items = [{ itemName: 'Item', description: '', quantity: 1, rate: 150, tax: 0 }];
      expect(instance.exceedsCreditLimit).toBe(true);
    });
  });
});