import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CompanyService } from '../../../services/company-service';

import { FinancialArSettings } from './financial-ar-settings';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('FinancialArSettings', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'createFinancialSettings',
      'setEditingCompany',
    ]);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const route = { parent: { snapshot: { params: {} } }, snapshot: { params: {} } } as ActivatedRoute;
    const instance = new FinancialArSettings(fb, companyService, router, route);
    instance.buildForm();
    instance.companyId = 1;
    return { instance, companyService, router };
  };

  it('should create', () => {
    const { instance } = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('form behaviour', () => {
    it('requires numeric fields to respect minimum values', () => {
      const { instance } = createComponent();
      instance.financialForm.patchValue({
        fiscalYearStartMonth: 'Jan',
        revenueRecognitionMode: 'Accrual',
        defaultTaxHandling: 'Standard',
        defaultPaymentTerms: 'Net30',
        agingBucketConfig: 'Standard',
        dunningFrequencyDays: 0,
        defaultCreditLimit: -1,
      });
      expect(instance.financialForm.invalid).toBe(true);
    });

    it('does not submit add mode when form is invalid', () => {
      const { instance, companyService } = createComponent();
      instance.financialForm.patchValue({
        fiscalYearStartMonth: '',
      });
      instance.saveFinancialSettings();
      expect(companyService.createFinancialSettings).not.toHaveBeenCalled();
    });
  });
});