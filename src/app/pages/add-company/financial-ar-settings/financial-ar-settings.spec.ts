import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CompanyService } from '../../../services/company-service';
import { CompanyEntity, CompanyResponse } from '../../../models/company.model';

import { FinancialArSettings } from './financial-ar-settings';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';
import { ToastrService } from 'ngx-toastr';

describe('FinancialArSettings', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'createFinancialSettings',
      'setEditingCompany',
      'setOriginalCompany',
      'getChangedCompanyPayload',
      'updateCompany',
      'getEditingCompanySnapshot',
    ]);

    // ✅ Keep a local snapshot that mimics the real service behavior
    let snapshot: CompanyEntity | null = createCompanyStub();
    companyService.getEditingCompanySnapshot.mockImplementation(() => snapshot);
    companyService.setEditingCompany.mockImplementation((c) => {
      snapshot = c as CompanyEntity | null;
    });

    const router = createSpyObj<Router>('Router', ['navigate']);
    const route = {
      parent: { snapshot: { params: {} } },
      snapshot: { params: {} },
    } as ActivatedRoute;
    const toastr = createSpyObj<ToastrService>('ToastrService', ['error']);

    companyService.updateCompany.mockReturnValue(of(createCompanyResponse()));
    companyService.getChangedCompanyPayload.mockReturnValue({ legalName: 'Updated' });

    const instance = new FinancialArSettings(fb, companyService, router, route, toastr);
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
    it('calls the API and navigates to onboarding complete in add mode', () => {
      const { instance, companyService, router } = createComponent();
      const formValue = createValidFinancials();
      instance.financialForm.patchValue(formValue);
      companyService.createFinancialSettings.mockReturnValue(of(createCompanyResponse()));
      instance.saveFinancialSettings();
      expect(companyService.createFinancialSettings).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ defaultCreditLimit: 1000 }),
      );
      expect(router.navigate).toHaveBeenCalledWith(['/admin/ar-company/onboarding-complete'], {
        queryParams: { id: 1 },
      });
    });

    it('persists edit-mode changes locally and updates the company', () => {
      const { instance, companyService, router } = createComponent();
      instance.isEditMode = true;
      instance.companyId = 4;
      instance.companyData = createCompanyStub();
      instance.financialForm.patchValue(createValidFinancials());
      instance.saveFinancialSettings();
      expect(companyService.createFinancialSettings).not.toHaveBeenCalled();
      expect(companyService.setEditingCompany).toHaveBeenCalled();
      expect(companyService.updateCompany).toHaveBeenCalledWith(4, { legalName: 'Updated' });
      expect(router.navigate).toHaveBeenCalledWith(['/admin/ar-company']);
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
    defaultCreditLimit: '1000',
  };
}

function createCompanyStub(): CompanyEntity {
  return {
    id: 4,
    legalName: 'Acme',
    tradeName: 'Acme',
    companyCode: 'AC',
    country: 'USA',
    baseCurrency: 'USD',
    timeZone: 'UTC',

    companyAddress: {
      addressLine1: '123 Main St',
      city: 'New York',
      stateProvince: 'NY',
      postalCode: '10001',
      addressCountry: 'USA',
      primaryContactName: 'John Doe',
      position: 'Manager',
      primaryContactEmail: 'john@acme.com',
      primaryContactPhone: '1234567890',
      primaryContactCountry: 'USA',
    },

    financialSettings: {
      fiscalYearStartMonth: 1,
      revenueRecognitionMode: 'Accrual',
      defaultTaxHandling: 'Standard',
      defaultPaymentTerms: 'Net30',
      defaultCreditLimit: 1000,
    },
  } as CompanyEntity;
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
