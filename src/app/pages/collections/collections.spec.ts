import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Customer } from '../../services/customer';
import { CollectionService } from '../../services/collection-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { UserContextService } from '../../services/user-context.service';

import { Collections } from './collections';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('Collections', () => {
  const createComponent = (canCreatePromise = true) => {
    const customerService = createSpyObj<Customer>('Customer', ['getCustomers']);
    const collectionService = createSpyObj<CollectionService>('CollectionService', [
      'getPromiseToPay',
    ]);
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const userContext = createSpyObj<UserContextService>('UserContextService', ['hasPermission']);
    userContext.hasPermission.mockImplementation((code: string) => {
      if (code === 'CREATE_PROMISE_TO_PAY') {
        return canCreatePromise;
      }
      return true;
    });

    return new Collections(
      customerService,
      collectionService,
      companySelection,
      cdr,
      toastr,
      router,
      userContext
    );
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('helper logic', () => {
    it('maps raw statuses to readable labels', () => {
      const instance = createComponent();
      expect(instance.getStatusLabel('PENDING')).toBe('Pending');
      expect(instance.getStatusLabel('UNKNOWN')).toBe('UNKNOWN');
      expect(instance.getStatusClass('REJECTED')).toBe('status-rejected');
    });

    it('respects permissions when opening the promise dialog', () => {
      const instance = createComponent(false);
      instance.openPromisePopup();
      expect(instance.showPromisePopup).toBe(false);
      const allowed = createComponent(true);
      allowed.openPromisePopup();
      expect(allowed.showPromisePopup).toBe(true);
    });
  });
});