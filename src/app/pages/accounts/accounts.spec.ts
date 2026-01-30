import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { Accounts } from './accounts';
import { BankAccountService } from '../../services/bank-account-service';
import { GlCodeService } from '../../services/gl-code-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { ToastrService } from 'ngx-toastr';
import { UserContextService } from '../../services/user-context.service';

describe('Accounts', () => {
  let component: Accounts;
  let fixture: ComponentFixture<Accounts>;

  let companySelectionSubject: Subject<string | null>;

  beforeEach(async () => {
    const bankAccountServiceMock = jasmine.createSpyObj<BankAccountService>('BankAccountService', [
      'getBankAccounts',
      'createBankAccount',
      'createBankGlMapping',
      'getBankAccountGlMapping',
      'updateBankGlMapping',
    ]);
    bankAccountServiceMock.getBankAccounts.and.returnValue(
      of({ statusCode: 200, status: 'success', message: '', data: [] })
    );
    bankAccountServiceMock.createBankAccount.and.returnValue(
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
    bankAccountServiceMock.createBankGlMapping.and.returnValue(
      of({ statusCode: 200, status: 'success', message: 'ok', data: null })
    );
    bankAccountServiceMock.getBankAccountGlMapping.and.returnValue(
      of({ statusCode: 200, status: 'success', message: 'ok', data: null })
    );
    bankAccountServiceMock.updateBankGlMapping.and.returnValue(
      of({ statusCode: 200, status: 'success', message: 'ok', data: null })
    );

    const glCodeServiceMock = jasmine.createSpyObj<GlCodeService>('GlCodeService', ['getGlCode']);
    glCodeServiceMock.getGlCode.and.returnValue(
      of({ statusCode: 200, status: 'success', message: 'ok', data: [] })
    );

    companySelectionSubject = new Subject<string | null>();
    const companySelectionMock = {
      selectedCompanyId$: companySelectionSubject.asObservable(),
    } as CompanySelectionService;

    const toastrMock = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
      'warning',
      'info',
    ]);

    const userContextMock = jasmine.createSpyObj<UserContextService>('UserContextService', [
      'hasPermission',
      'isAdmin',
    ]);
    userContextMock.hasPermission.and.returnValue(true);
    userContextMock.isAdmin.and.returnValue(true);

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
