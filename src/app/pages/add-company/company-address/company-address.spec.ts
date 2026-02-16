import { AbstractControl, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CompanyService } from '../../../services/company-service';
import { RoleService } from '../../../services/role-service';
import { CompanyEntity, CreateAddressResponse } from '../../../models/company.model';

import { CompanyAddress } from './company-address';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('CompanyAddress', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const route = { parent: { snapshot: { params: {} } } } as ActivatedRoute;
    const router = createSpyObj<Router>('Router', ['navigate']);
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'createAddress',
      'setEditingCompany',
    ]);
    const roleService = createSpyObj<RoleService>('RoleService', ['getRoles']);
    roleService.getRoles.mockReturnValue(
      of({
        statusCode: 200,
        status: 'success',
        message: 'ok',
        data: [],
      })
    );
    const instance = new CompanyAddress(fb, route, router, companyService, roleService);
    instance.buildForm();
    return { instance, companyService, router, roleService };
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

  describe('validators', () => {
    it('enforces a word limit in text fields', () => {
      const { instance } = createComponent();
      const validator = instance.wordLimitValidator(2);
      expect(validator(mockControl('one two'))).toBeNull();
      expect(validator(mockControl('one two three'))).toEqual({
        wordLimit: true,
      });
    });

    it('only allows digits inside the postal code input', () => {
      const { instance } = createComponent();
      instance.addressForm.get('postalCode')?.setValue('abc');
      instance.onPostalInput();
      expect(instance.addressForm.get('postalCode')?.value).toBe('');
      instance.addressForm.get('postalCode')?.setValue('12AB3499');
      instance.onPostalInput();
      expect(instance.addressForm.get('postalCode')?.value).toBe('123499');
    });
  });

  describe('input sanitizers', () => {
    it('cleans city, state, phone, and email fields', () => {
      const { instance } = createComponent();
      instance.addressForm.patchValue({
        city: 'NYC123',
        stateProvince: 'CA99',
        county: 'Kings123',
        primaryContactPhone: '12-34-56abc',
        primaryContactEmail: 'USER@TEST.COM',
      });
      instance.onCityInput();
      instance.onStateInput();
      instance.onCountyInput();
      instance.onPhoneInput();
      instance.onEmailInput();
      expect(instance.addressForm.get('city')?.value).toBe('NYC');
      expect(instance.addressForm.get('stateProvince')?.value).toBe('CA');
      expect(instance.addressForm.get('county')?.value).toBe('Kings');
      expect(instance.addressForm.get('primaryContactPhone')?.value).toBe('(123) 456');
      expect(instance.addressForm.get('primaryContactEmail')?.value).toBe('user@test.com');
    });
  });

  describe('form submission', () => {
    it('does not submit when invalid', () => {
      const { instance, companyService } = createComponent();
      instance.addressForm.get('addressLine1')?.setValue('');
      instance.saveAddress();
      expect(companyService.createAddress).not.toHaveBeenCalled();
    });

    it('sends payload to the API in add mode', () => {
      const { instance, companyService, router } = createComponent();
      instance.companyId = 5;
      instance.addressForm.patchValue(createValidAddress());
      companyService.createAddress.mockReturnValue(of(createAddressResponse()));
      instance.saveAddress();
      expect(companyService.createAddress).toHaveBeenCalledWith(5, createValidAddress());
      expect(router.navigate).toHaveBeenCalledWith(['/admin/ar-company/add/step-3']);
    });

    it('persists edit data locally and routes forward', () => {
      const { instance, companyService, router } = createComponent();
      instance.isEditMode = true;
      instance.companyId = 9;
      instance.companyData = createCompanyStub();
      instance.addressForm.patchValue(createValidAddress());
      instance.saveAddress();
      expect(companyService.createAddress).not.toHaveBeenCalled();
      expect(companyService.setEditingCompany).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/admin/ar-company/edit/9/step-3']);
    });
  });
});

function mockControl(value: string | null): AbstractControl {
  return { value } as unknown as AbstractControl;
}

function createValidAddress() {
  return {
    addressLine1: '123 St',
    city: 'Metropolis',
    stateProvince: 'State',
    county: 'Metro County',
    postalCode: '123456',
    addressCountry: 'US',
    primaryContactName: 'John',
    position: 'AR Manager',
    primaryContactEmail: 'john@test.com',
    primaryContactPhone: '(123) 456-7890',
    website: 'https://example.com',
    primaryContactCountry: 'US',
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
      county: '',
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

function createAddressResponse(
  overrides?: Partial<CreateAddressResponse['data']>
): CreateAddressResponse {
  return {
    statusCode: 200,
    status: 'success',
    message: 'ok',
    data: {
      ...createCompanyStub().companyAddress,
      ...overrides,
    },
  };
}
