import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CompanyService } from '../../../services/company-service';
import { CompanyEntity, CompanyResponse } from '../../../models/company.model';
import { ActivatedRoute } from '@angular/router';
import { CompanyDetail } from './company-detail';
import { createSpyObj, SpyObject } from 'src/testing/spy-helpers';

describe('CompanyDetail', () => {
  let component: CompanyDetail;
  let fixture: ComponentFixture<CompanyDetail>;
  let companyService: SpyObject<CompanyService>;

  const createCompany = (): CompanyEntity => ({
    id: 10,
    legalName: 'Acme AR Company',
    tradeName: 'Acme',
    companyCode: 'ACM01',
    country: 'USA',
    baseCurrency: 'USD',
    timeZone: 'UTC',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    financialSettings: {
      id: 1,
      fiscalYearStartMonth: 1,
      defaultArAccountCode: '',
      revenueRecognitionMode: 'On Invoice',
      defaultTaxHandling: 'Line Item Level',
      defaultPaymentTerms: 'Net 30',
      allowOtherTerms: false,
      enableCreditLimitChecking: true,
      agingBucketConfig: '',
      dunningFrequencyDays: 0,
      enableAutomatedDunningEmails: false,
      defaultCreditLimit: 5000,
    },
    paymentSettings: {
      id: 1,
      acceptCheck: true,
      acceptCreditCard: true,
      acceptBankTransfer: true,
      acceptCash: false,
      remittanceInstructions: 'Send via ACH',
    },
    companyAddress: {
      id: 1,
      addressLine1: '123 Main',
      city: 'Austin',
      stateProvince: 'TX',
      county: 'Travis',
      postalCode: '78701',
      addressCountry: 'USA',
      primaryContactName: 'Jane Doe',
      position: 'AR Manager',
      primaryContactEmail: 'jane@example.com',
      primaryContactPhone: '5551112222',
      website: null,
      primaryContactCountry: 'USA',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    bankAccounts: [],
    users: [],
    companyCustomers: [],
  });

  beforeEach(async () => {
    companyService = createSpyObj<CompanyService>('CompanyService', ['getCompanyById']);
    const response: CompanyResponse = {
      statusCode: 200,
      status: 'success',
      message: 'ok',
      data: createCompany(),
    };
    companyService.getCompanyById.mockReturnValue(of(response));

    await TestBed.configureTestingModule({
      imports: [CompanyDetail],
      providers: [
        { provide: CompanyService, useValue: companyService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => '10',
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load company detail', () => {
    expect(component).toBeTruthy();
    expect(companyService.getCompanyById).toHaveBeenCalledWith(10);
    expect(component.companyData?.legalName).toBe('Acme AR Company');
  });
});
