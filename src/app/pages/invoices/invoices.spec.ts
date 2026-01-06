import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { InvoiceService } from '../../services/invoice-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';

import { Invoices } from './invoices';
import { Invoice } from '../../models/invoice.model';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('Invoices', () => {
  const createComponent = () => {
    const invoiceService = createSpyObj<InvoiceService>('InvoiceService', ['getInvoices']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const router = createSpyObj<Router>('Router', ['navigate']);
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    const userContext = createSpyObj<UserContextService>('UserContextService', ['hasPermission']);
    userContext.hasPermission.mockReturnValue(true);
    return new Invoices(invoiceService, cdr, router, companySelection, userContext);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('filtering and helpers', () => {
    it('filters invoices when searching by customer name', () => {
      const instance = createComponent();
      instance.allInvoices = [
        createInvoice({ customer: { ...createInvoice().customer, customerName: 'Acme' } }),
        createInvoice({ customer: { ...createInvoice().customer, customerName: 'Globex' } }),
      ];
      instance.searchName = 'acm';
      instance.onSearchChange();
      expect(instance.invoices.length).toBe(1);
      expect(instance.invoices[0].customer.customerName).toBe('Acme');
    });

    it('returns readable status labels', () => {
      const instance = createComponent();
      expect(instance.getStatus(createInvoice({ status: 'PAID' }))).toBe('Paid');
      expect(instance.getStatus(createInvoice({ status: 'OPEN' }))).toBe('Due');
    });
  });
});

function createInvoice(overrides: Partial<Invoice> = {}): Invoice {
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
      deleted: false,
      address: null,
      cashApplication: null,
      dunning: null,
      eft: null,
      statement: null,
      vat: null,
    },
    ...overrides,
  };
}
