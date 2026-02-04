import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CompanyService } from '../../../services/company-service';
import { CompanyEntity, CompanyResponse } from '../../../models/company.model';
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
      'setOriginalCompany',
    ]);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const route = { parent: { snapshot: { params: {} } }, snapshot: { params: {} } } as ActivatedRoute;
    const toastr = createSpyObj<ToastrService>('ToastrService', ['error']);
    const instance = new BanksAndPayments(fb, companyService, router, route, toastr);
    instance.buildForm();
    return { instance, companyService, router, toastr };
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

  describe('payment validation', () => {
    it('requires at least one payment method to be enabled', () => {
      const { instance } = createComponent();
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
      const { instance } = createComponent();
      const hasValues = (instance as unknown as {
        hasValues(source: Record<string, unknown>, fields: string[]): boolean;
      }).hasValues;
      expect(hasValues.call(instance, { name: 'Acme' }, ['name'])).toBe(true);
      expect(hasValues.call(instance, { name: '' }, ['name'])).toBe(false);
    });
  });

  describe('form submission', () => {
    it('does not call API when invalid', () => {
      const { instance, companyService } = createComponent();
      instance.saveBankPayment();
      expect(companyService.createBanking).not.toHaveBeenCalled();
    });

    it('submits payment details in add mode', () => {
      const { instance, companyService, router } = createComponent();
      instance.companyId = 3;
      instance.paymentForm.patchValue(createValidPaymentForm());
      const expectedPayload = createExpectedPayload();
      companyService.createBanking.mockReturnValue(of(createCompanyResponse()));
      instance.saveBankPayment();
      expect(companyService.createBanking).toHaveBeenCalledWith(3, expectedPayload);
      expect(router.navigate).toHaveBeenCalledWith(['/admin/ar-company/onboarding-complete'], {
        queryParams: { id: 3 },
      });
    });

    it('shows an error when edit mode lacks cached data', () => {
      const { instance, companyService, toastr } = createComponent();
      instance.isEditMode = true;
      instance.companyId = 5;
      instance.paymentForm.patchValue(createValidPaymentForm());
      companyService.getEditingCompanySnapshot.mockReturnValue(null);
      instance.saveBankPayment();
      expect(toastr.error).toHaveBeenCalledWith(
        'AR company data is missing. Please reload and try again.'
      );
      expect(companyService.updateCompany).not.toHaveBeenCalled();
    });

    it('updates the AR Company when edit mode validations pass', () => {
      const { instance, companyService, router } = createComponent();
      instance.isEditMode = true;
      instance.companyId = 6;
      instance.paymentForm.patchValue(createValidPaymentForm());
      const company = createCompanyStub();
      companyService.getEditingCompanySnapshot.mockReturnValue(company);
      companyService.getChangedCompanyPayload.mockReturnValue({ legalName: 'Updated' });
      companyService.updateCompany.mockReturnValue(
        of(createCompanyResponse({ legalName: 'Updated' }))
      );
      instance.saveBankPayment();
      expect(companyService.updateCompany).toHaveBeenCalledWith(6, { legalName: 'Updated' });
      expect(companyService.setEditingCompany).toHaveBeenCalledWith(null);
      expect(companyService.setOriginalCompany).toHaveBeenCalledWith(null);
      expect(router.navigate).toHaveBeenCalledWith(['/admin/ar-company']);
    });
  });
});

function createValidPaymentForm() {
  return {
    bankName: 'Acme Bank',
    accountNumber: '123456789',
    acceptCheck: false,
    acceptCreditCard: false,
    acceptBankTransfer: false,
    acceptCash: true,
    remittanceInstructions: 'Pay via portal.',
  };
}

function createExpectedPayload() {
  const form = createValidPaymentForm();
  return {
    paymentSettings: {
      acceptCheck: form.acceptCheck,
      acceptCreditCard: form.acceptCreditCard,
      acceptBankTransfer: form.acceptBankTransfer,
      acceptCash: form.acceptCash,
      remittanceInstructions: form.remittanceInstructions,
    },
    bankAccounts: [
      {
        bankName: form.bankName,
        accountNumber: form.accountNumber,
      },
    ],
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
      defaultArAccountCode: 'AR-001',
      revenueRecognitionMode: 'Accrual',
      defaultTaxHandling: 'Standard',
      defaultPaymentTerms: 'Net30',
      allowOtherTerms: false,
      enableCreditLimitChecking: false,
      agingBucketConfig: 'Standard',
      dunningFrequencyDays: 5,
      enableAutomatedDunningEmails: false,
      defaultCreditLimit: 1000,
    },
    paymentSettings: {
      id: 1,
      acceptCheck: true,
      acceptCreditCard: true,
      acceptBankTransfer: true,
      acceptCash: true,
      remittanceInstructions: 'Pay now',
    },
    companyAddress: {
      id: 1,
      addressLine1: '123 St',
      city: 'City',
      stateProvince: 'State',
      postalCode: '123456',
      addressCountry: 'USA',
      primaryContactName: 'John',
      position: 'AR Manager',
      primaryContactEmail: 'john@example.com',
      primaryContactPhone: '1234567890',
      website: 'https://example.com',
      primaryContactCountry: 'USA',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    bankAccounts: [
      {
        id: 1,
        bankName: 'Acme Bank',
        accountNumber: '123456789',
        ifscSwift: null,
        currency: null,
        isDefault: true,
      },
    ],
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
