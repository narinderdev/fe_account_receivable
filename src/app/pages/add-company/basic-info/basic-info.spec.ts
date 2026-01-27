import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CompanyService } from '../../../services/company-service';
import { CompanyEntity, CreateCompanyResponse } from '../../../models/company.model';

import { BasicInfo } from './basic-info';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('BasicInfo', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'createCompany',
      'setEditingCompany',
    ]);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const route = { parent: { snapshot: { params: {} } }, snapshot: { params: {} } } as ActivatedRoute;
    const instance = new BasicInfo(fb, companyService, router, route);
    instance.buildForm();
    instance.basicForm.patchValue({
      legalName: 'Acme',
      tradeName: 'Acme',
      companyCode: 'AC',
      country: 'USA',
      baseCurrency: 'USD',
      timeZone: 'UTC',
    });
    instance.companyData = createCompanyStub();
    companyService.createCompany.mockReturnValue(of(createCreateCompanyResponse()));
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

  describe('helpers', () => {
    it('gracefully handles invalid cached JSON', () => {
      const { instance } = createComponent();
      const parseCompany = (instance as unknown as {
        parseCompany(value: string | null): CompanyEntity | null;
      }).parseCompany;
      expect(parseCompany.call(instance, 'not-json')).toBeNull();
      const parsed = parseCompany.call(instance, '{"id":5}');
      expect(parsed?.id).toBe(5);
    });

    it('persists edit changes into the company service', () => {
      const { instance, companyService } = createComponent();
      instance.isEditMode = true;
      const persistEditChanges = (instance as unknown as {
        persistEditChanges(force?: boolean): void;
      }).persistEditChanges;
      persistEditChanges.call(instance, true);
      expect(companyService.setEditingCompany).toHaveBeenCalled();
    });
  });

  describe('form submission', () => {
    it('does not submit when the form is invalid', () => {
      const { instance, companyService } = createComponent();
      instance.basicForm.get('legalName')?.setValue('');
      instance.saveAndContinue();
      expect(companyService.createCompany).not.toHaveBeenCalled();
    });

    it('submits via company service in add mode and routes to step 2', () => {
      const { instance, companyService, router } = createComponent();
      companyService.createCompany.mockReturnValue(of(createCreateCompanyResponse({ id: 7 })));
      instance.saveAndContinue();
      expect(companyService.createCompany).toHaveBeenCalledWith(instance.basicForm.value);
      expect(router.navigate).toHaveBeenCalledWith(['/admin/company/add/step-2'], {
        queryParams: { id: 7 },
      });
    });

    it('persists edit-mode changes and routes to the next step', () => {
      const { instance, companyService, router } = createComponent();
      instance.isEditMode = true;
      instance.companyId = 12;
      instance.saveAndContinue();
      expect(companyService.createCompany).not.toHaveBeenCalled();
      expect(companyService.setEditingCompany).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/admin/company/edit/12/step-2']);
    });
  });
});

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
      revenueRecognitionMode: 'On Invoice',
      defaultTaxHandling: 'Line Item Level',
      defaultPaymentTerms: 'Net 30',
      allowOtherTerms: false,
      enableCreditLimitChecking: false,
      agingBucketConfig: '0-30',
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
      addressLine1: null,
      city: null,
      stateProvince: null,
      postalCode: null,
      addressCountry: null,
      primaryContactName: null,
      position: null,
      primaryContactEmail: null,
      primaryContactPhone: null,
      website: null,
      primaryContactCountry: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    bankAccounts: [],
    users: [],
    companyCustomers: [],
  };
}

function createCreateCompanyResponse(
  overrides?: Partial<CreateCompanyResponse['data']>
): CreateCompanyResponse {
  return {
    statusCode: 201,
    status: 'success',
    message: 'created',
    data: {
      id: 1,
      legalName: 'Acme',
      tradeName: 'Acme',
      companyCode: 'AC',
      country: 'USA',
      baseCurrency: 'USD',
      timeZone: 'UTC',
      addressLine1: null,
      city: null,
      stateProvince: null,
      postalCode: null,
      addressCountry: null,
      primaryContactName: null,
      position: null,
      primaryContactEmail: null,
      primaryContactPhone: null,
      website: null,
      primaryContactCountry: null,
      ...overrides,
    },
  };
}
