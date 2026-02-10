import { ChangeDetectorRef } from '@angular/core';
import { AgingService } from '../../services/aging-service';
import { Customer } from '../../services/customer';
import { CompanySelectionService } from '../../services/company-selection.service';
import { CompanyService } from '../../services/company-service';
import { Subject } from 'rxjs';

import { Aging } from './aging';
import { createSpy, createSpyObj } from '../../../testing/spy-helpers';

describe('Aging', () => {
  const createComponent = () => {
    const agingService = createSpyObj<AgingService>('AgingService', ['getAging']);
    const customerService = createSpyObj<Customer>('Customer', ['getCustomers']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    const companyService = createSpyObj<CompanyService>('CompanyService', ['getCompanyById']);
    return new Aging(agingService, customerService, cdr, companySelection, companyService);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('helper logic', () => {
    it('cycles placeholder colors using the row index', () => {
      const instance = createComponent();
      expect(instance.getInitialColor(0)).toEqual({ background: '#DBEAFE', color: '#2563EB' });
      expect(instance.getInitialColor(6)).toEqual({ background: '#DBEAFE', color: '#2563EB' });
    });

    it('builds pagination ranges with ellipsis', () => {
      const instance = createComponent();
      instance.totalPages = 10;
      instance.currentPage = 4;
      const pages = instance.getPageNumbers();
      expect(pages[0]).toBe(1);
      expect(pages.includes(-1)).toBe(true);
    });
  });
});
