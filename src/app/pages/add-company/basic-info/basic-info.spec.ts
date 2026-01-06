import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CompanyService } from '../../../services/company-service';
import { CompanyEntity } from '../../../models/company.model';

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
    instance.basicForm = fb.group({
      legalName: ['Acme'],
      tradeName: ['Acme'],
      companyCode: ['AC'],
      country: ['USA'],
      baseCurrency: ['USD'],
      timeZone: ['UTC'],
    });
    instance.companyData = createCompanyStub();
    return { instance, companyService };
  };

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
