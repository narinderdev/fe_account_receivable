import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CompanyService } from '../../../services/company-service';
import { CompanyEntity, CompanyResponse } from '../../../models/company.model';

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

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  describe('form submission', () => {
    it('calls the API and navigates forward in add mode', () => {
      const { instance, companyService, router } = createComponent();
      instance.financialForm.patchValue(createValidFinancials());
      const payload = instance.financialForm.value;
      companyService.createFinancialSettings.mockReturnValue(of(createCompanyResponse()));
      instance.saveFinancialSettings();
      expect(companyService.createFinancialSettings).toHaveBeenCalledWith(1, payload);
      expect(router.navigate).toHaveBeenCalledWith(['/admin/lender/add/step-4']);
    });

    it('persists edit-mode changes locally', () => {
      const { instance, companyService, router } = createComponent();
      instance.isEditMode = true;
      instance.companyId = 4;
      instance.companyData = createCompanyStub();
      instance.financialForm.patchValue(createValidFinancials());
      instance.saveFinancialSettings();
      expect(companyService.createFinancialSettings).not.toHaveBeenCalled();
      expect(companyService.setEditingCompany).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/admin/lender/edit/4/step-4']);
    });
  });
});

function createValidFinancials() {
  return {
    fiscalYearStartMonth: 'January',
    revenueRecognitionMode: 'Accrual',
    defaultTaxHandling: 'Standard',
    defaultPaymentTerms: 'Net30',
    allowOtherTerms: true,
    enableCreditLimitChecking: false,
    agingBucketConfig: 'Standard',
    dunningFrequencyDays: 5,
    enableAutomatedDunningEmails: true,
    defaultCreditLimit: 1000,
  };
}

function createCompanyStub(): CompanyEntity {
  return {
    id: 1,
    legalName: 'Acme',
    tradeName: 'Acme',
    companyCode: 'AC',
    country: 'USA',
    baseCurrency: 'USD',
    timeZone: 'UTC',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    financialSettings: {
      id: 1,
      fiscalYearStartMonth: 1,
      defaultArAccountCode: '',
      revenueRecognitionMode: '',
      defaultTaxHandling: '',
      defaultPaymentTerms: '',
      allowOtherTerms: false,
      enableCreditLimitChecking: false,
      agingBucketConfig: '',
      dunningFrequencyDays: 1,
      enableAutomatedDunningEmails: false,
      defaultCreditLimit: 0,
    },
    paymentSettings: {
      id: 1,
      acceptCheck: false,
      acceptCreditCard: false,
      acceptBankTransfer: false,
      acceptCash: false,
      remittanceInstructions: '',
    },
    companyAddress: {
      id: 1,
      addressLine1: '',
      city: '',
      stateProvince: '',
      postalCode: '',
      addressCountry: '',
      primaryContactName: '',
      position: '',
      primaryContactEmail: '',
      primaryContactPhone: '',
      website: '',
      primaryContactCountry: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    bankAccounts: [],
    users: [],
    companyCustomers: [],
  };
}

function createCompanyResponse(overrides?: Partial<CompanyResponse['data']>): CompanyResponse {
  return {
    statusCode: 200,
    status: 'success',
    message: 'ok',
    data: {
      ...createCompanyStub(),
      ...overrides,
    },
  };
}
