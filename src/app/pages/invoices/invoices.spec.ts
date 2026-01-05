import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { InvoiceService } from '../../services/invoice-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';

import { Invoices } from './invoices';
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
        { customer: { customerName: 'Acme' } },
        { customer: { customerName: 'Globex' } },
      ] as any;
      instance.searchName = 'acm';
      instance.onSearchChange();
      expect(instance.invoices.length).toBe(1);
      expect(instance.invoices[0].customer.customerName).toBe('Acme');
    });

    it('returns readable status labels', () => {
      const instance = createComponent();
      expect(instance.getStatus({ status: 'PAID' } as any)).toBe('Paid');
      expect(instance.getStatus({ status: 'OPEN' } as any)).toBe('Due');
    });
  });
});