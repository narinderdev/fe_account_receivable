import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Customer } from '../../services/customer';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { UserContextService } from '../../services/user-context.service';

import { Customers } from './customers';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('Customers', () => {
  const createComponent = (canCreate = true) => {
    const customerService = createSpyObj<Customer>('Customer', ['getCustomers']);
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const router = createSpyObj<Router>('Router', ['navigate']);
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const userContext = createSpyObj<UserContextService>('UserContextService', ['hasPermission']);
    userContext.hasPermission.mockImplementation((code: string) => (code === 'CREATE_CUSTOMER' ? canCreate : true));

    return new Customers(
      customerService,
      companySelection,
      cdr,
      router,
      toastr,
      userContext
    );
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('helper logic', () => {
    it('does not open import modal when user lacks permission', () => {
      const instance = createComponent(false);
      instance.openImportModal();
      expect(instance.isImportModalOpen).toBe(false);
    });

    it('returns avatar colors consistently', () => {
      const instance = createComponent();
      expect(instance.getInitialColor(0)).toEqual({ background: '#DBEAFE', color: '#2563EB' });
      expect(instance.getInitialColor(6)).toEqual({ background: '#DBEAFE', color: '#2563EB' });
    });
  });
});
