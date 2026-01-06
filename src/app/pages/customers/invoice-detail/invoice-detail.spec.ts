import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { Customer } from '../../../services/customer';
import { InvoiceWithItems } from '../../../models/invoice.model';

import { InvoiceDetail } from './invoice-detail';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('InvoiceDetail', () => {
  const createComponent = () => {
    const route = {
      snapshot: { paramMap: { get: (key: string) => (key === 'customerId' ? '1' : '2') } },
    } as unknown as ActivatedRoute;
    const customerService = createSpyObj<Customer>('Customer', ['getInvoiceDetail']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    return new InvoiceDetail(route, customerService, cdr);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('formatters', () => {
    it('formats invoice dates or shows fallback', () => {
      const instance = createComponent();
      expect(instance.formatDate('2024-01-15')).toContain('Jan');
      expect(instance.formatDate('')).toBe('--');
    });

    it('maps invoice status to friendly values', () => {
      const instance = createComponent();
      instance.invoice = createInvoice({ status: 'PAID' });
      expect(instance.getStatusText()).toBe('PAID');
      instance.invoice = createInvoice({ status: 'COMPLETED' as 'COMPLETED' });
      expect(instance.getStatusClass()).toBe('status-paid');
      instance.invoice = null;
      expect(instance.getStatusText()).toBe('OPEN');
    });
  });
});

function createInvoice(overrides: Partial<InvoiceWithItems> = {}): InvoiceWithItems {
  const base: InvoiceWithItems = {
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
    items: [],
    ...overrides,
  };

  return base;
}
