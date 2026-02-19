import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CreditMemoDetail } from './credit-memo-detail';
import { CreditMemoService } from '../../../services/credit-memo-service';
import { CompanySelectionService } from '../../../services/company-selection.service';
import { createSpyObj } from 'src/testing/spy-helpers';

describe('CreditMemoDetail', () => {
  let component: CreditMemoDetail;
  let fixture: ComponentFixture<CreditMemoDetail>;

  beforeEach(async () => {
    const creditMemoService = createSpyObj<CreditMemoService>('CreditMemoService', [
      'getCompanyCreditMemos',
    ]);
    creditMemoService.getCompanyCreditMemos.mockReturnValue(
      of({
        status: 'success',
        statusCode: 200,
        message: 'ok',
        data: {
          content: [],
          totalPages: 0,
          totalElements: 0,
          number: 0,
          size: 0,
          first: true,
          last: true,
          rows: [],
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [CreditMemoDetail],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ creditMemoId: '1' }),
              queryParamMap: convertToParamMap({ status: 'CREATED' }),
            },
          },
        },
        {
          provide: CreditMemoService,
          useValue: creditMemoService,
        },
        {
          provide: CompanySelectionService,
          useValue: {
            selectedCompanyId$: of(1),
          } as unknown as CompanySelectionService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreditMemoDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
