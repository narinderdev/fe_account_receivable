import { FormBuilder } from '@angular/forms';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Customer } from '../../services/customer';
import { ToastrService } from 'ngx-toastr';
import { CompanyService } from '../../services/company-service';

import { AddCustomer } from './add-customer';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('AddCustomer', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const customerService = createSpyObj<Customer>('Customer', [
      'getCustomerById',
      'createCustomer',
      'saveAddress',
    ]);
    const zone = { run: (fn: () => void) => fn() } as NgZone;
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const router = createSpyObj<Router>('Router', ['navigate']);
    const route = { snapshot: { params: {} } } as ActivatedRoute;
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'getCompany',
      'setEditingCompany',
    ]);

    const instance = new AddCustomer(
      fb,
      customerService,
      zone,
      cdr,
      router,
      route,
      toastr,
      companyService
    );
    instance.initializeForms();
    return instance;
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('logic helpers', () => {
    it('limits postal codes to six digits', () => {
      const instance = createComponent();
      const event = { target: { value: 'AB12 34ZZ99' } } as unknown as Event;
      instance.limitPostalCode(event);
      expect(instance.addressForm.get('postalCode')?.value).toBe('123499');
    });

    it('allows navigating only to unlocked tabs in add mode', () => {
      const instance = createComponent();
      instance.allowedTabs = ['main'];
      expect(instance.canAccessTab('address')).toBe(false);
      instance.isEditMode = true;
      expect(instance.canAccessTab('address')).toBe(true);
    });
  });
});