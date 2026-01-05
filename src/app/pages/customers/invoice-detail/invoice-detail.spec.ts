import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { Customer } from '../../../services/customer';

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
      instance.invoice = { status: 'PAID' } as any;
      expect(instance.getStatusText()).toBe('PAID');
      instance.invoice = { status: 'COMPLETED' } as any;
      expect(instance.getStatusClass()).toBe('status-paid');
      instance.invoice = null;
      expect(instance.getStatusText()).toBe('OPEN');
    });
  });
});