import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CompanyService } from '../../../services/company-service';
import { ToastrService } from 'ngx-toastr';

import { BanksAndPayments } from './banks-and-payments';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('BanksAndPayments', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'createBanking',
      'setEditingCompany',
      'getEditingCompanySnapshot',
      'getChangedCompanyPayload',
      'updateCompany',
    ]);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const route = { parent: { snapshot: { params: {} } }, snapshot: { params: {} } } as ActivatedRoute;
    const toastr = createSpyObj<ToastrService>('ToastrService', ['error']);
    const instance = new BanksAndPayments(fb, companyService, router, route, toastr);
    instance.buildForm();
    return instance;
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('payment validation', () => {
    it('requires at least one payment method to be enabled', () => {
      const instance = createComponent();
      instance.paymentForm.patchValue({
        bankName: 'Acme Bank',
        accountNumber: '123456789',
        remittanceInstructions: 'Pay via portal.',
      });
      expect(instance.paymentForm.invalid).toBe(true);
      instance.paymentForm.patchValue({ acceptCash: true });
      expect(instance.paymentForm.valid).toBe(true);
    });

    it('verifies helper methods detect missing fields', () => {
      const instance = createComponent();
      const hasValues = (instance as unknown as {
        hasValues(source: Record<string, unknown>, fields: string[]): boolean;
      }).hasValues;
      expect(hasValues.call(instance, { name: 'Acme' }, ['name'])).toBe(true);
      expect(hasValues.call(instance, { name: '' }, ['name'])).toBe(false);
    });
  });
});
