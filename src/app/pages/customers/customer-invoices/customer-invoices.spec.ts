import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { Customer } from '../../../services/customer';

import { CustomerInvoices } from './customer-invoices';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('CustomerInvoices', () => {
  const createComponent = () => {
    const route = { snapshot: { paramMap: { get: () => '7' } } } as unknown as ActivatedRoute;
    const customerService = createSpyObj<Customer>('Customer', ['getCustomerInvoicesById']);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    return { instance: new CustomerInvoices(route, customerService, router, cdr), router };
  };

  it('should create', () => {
    const { instance } = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('helpers', () => {
    it('navigates to invoice details with the right parameters', () => {
      const { instance, router } = createComponent();
      instance.customerId = 7;
      instance.openInvoiceDetail(42);
      expect(router.navigate).toHaveBeenCalledWith(['/admin/customers', 7, 'invoices', 42]);
    });
  });
});