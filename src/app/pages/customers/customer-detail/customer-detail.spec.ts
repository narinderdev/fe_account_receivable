import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { Customer } from '../../../services/customer';
import { CollectionService } from '../../../services/collection-service';
import { MonthEndService } from '../../../services/month-end-service';

import { CustomerDetail } from './customer-detail';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('CustomerDetail', () => {
  const createComponent = () => {
    const route = { snapshot: { paramMap: { get: () => '1' } } } as unknown as ActivatedRoute;
    const customerService = createSpyObj<Customer>('Customer', ['getCustomerById', 'getCustomerInvoicesById']);
    const collectionService = createSpyObj<CollectionService>('CollectionService', ['getCustomerPromise']);
    const monthEndService = createSpyObj<MonthEndService>('MonthEndService', ['getCustomerMonthEnd']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    return new CustomerDetail(route, customerService, collectionService, monthEndService, cdr);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('helpers', () => {
    it('formats currency safely', () => {
      const instance = createComponent();
      expect(instance.formatCurrency(123)).toBe('$123.00');
      expect(instance.formatCurrency(null)).toBe('$0.00');
    });

    it('maps promise statuses to css classes', () => {
      const instance = createComponent();
      expect(instance.getStatusClass('COMPLETED')).toBe('status-completed');
      expect(instance.getStatusClass('UNKNOWN')).toBe('status-default');
    });
  });
});