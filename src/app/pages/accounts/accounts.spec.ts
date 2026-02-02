import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { Accounts } from './accounts';
import { BankAccountService } from '../../services/bank-account-service';
import { GlCodeService } from '../../services/gl-code-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { ToastrService } from 'ngx-toastr';
import { UserContextService } from '../../services/user-context.service';
import { createSpyObj } from 'src/testing/spy-helpers';

describe('Accounts', () => {
  let component: Accounts;
  let fixture: ComponentFixture<Accounts>;

  let companySelectionSubject: Subject<string | null>;

  beforeEach(async () => {
    const bankAccountServiceMock = createSpyObj<BankAccountService>('BankAccountService', [
      'getBankAccounts',
      'createBankAccount',
      'createBankGlMapping',
      'getBankAccountGlMapping',
      'updateBankGlMapping',
    ]);
    bankAccountServiceMock.getBankAccounts.mockReturnValue(
      of({ statusCode: 200, status: 'success', message: '', data: [] })
    );
    bankAccountServiceMock.createBankAccount.mockReturnValue(
      of({
        statusCode: 200,
        status: 'success',
        message: 'created',
        data: {
          bankAccountId: 1,
          bankName: 'Test',
          accountNumber: '123',
          currency: 'USD',
          isDefault: false,
          mappingStatus: 'MISSING',
        },
      })
    );
    const mappingResponse = {
      statusCode: 200,
      status: 'success',
      message: 'ok',
      data: {
        bankAccountId: 1,
        bankName: 'Test',
        bankNumber: '1111',
        glCode: 'BANK-001',
        glCodeId: 5,
        glDescription: 'Bank Code',
        mappingId: 9,
        status: 'ACTIVE' as const,
      },
    };
    bankAccountServiceMock.createBankGlMapping.mockReturnValue(of(mappingResponse));
    bankAccountServiceMock.getBankAccountGlMapping.mockReturnValue(of(mappingResponse));
    bankAccountServiceMock.updateBankGlMapping.mockReturnValue(of(mappingResponse));

    const glCodeServiceMock = createSpyObj<GlCodeService>('GlCodeService', ['getGlCode']);
    glCodeServiceMock.getGlCode.mockReturnValue(
      of({ statusCode: 200, status: 'success', message: 'ok', data: [] })
    );

    companySelectionSubject = new Subject<string | null>();
    const companySelectionMock = {
      selectedCompanyId$: companySelectionSubject.asObservable(),
    } as CompanySelectionService;

    const toastrMock = createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
      'warning',
      'info',
    ]);

    const userContextMock = createSpyObj<UserContextService>('UserContextService', [
      'hasPermission',
      'isAdmin',
    ]);
    userContextMock.hasPermission.mockReturnValue(true);
    userContextMock.isAdmin.mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [Accounts],
      providers: [
        { provide: BankAccountService, useValue: bankAccountServiceMock },
        { provide: GlCodeService, useValue: glCodeServiceMock },
        { provide: CompanySelectionService, useValue: companySelectionMock },
        { provide: ToastrService, useValue: toastrMock },
        { provide: UserContextService, useValue: userContextMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Accounts);
    component = fixture.componentInstance;
    fixture.detectChanges();
    companySelectionSubject.next(null);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('maps configured status to configured meta', () => {
    const meta = component.getMappingMeta('CONFIGURED');
    expect(meta.variant).toBe('configured');
    expect(meta.label).toBe('Configured');
  });
});
