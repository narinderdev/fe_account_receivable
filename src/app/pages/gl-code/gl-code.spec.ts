import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { GlCode } from './gl-code';
import { GlCodeService } from '../../services/gl-code-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { UserContextService } from '../../services/user-context.service';

describe('GlCode', () => {
  let component: GlCode;
  let fixture: ComponentFixture<GlCode>;

  const glCodeServiceMock = {
    getGlCode: () => of({ data: [] }),
    createGlCode: () => of({ message: '' }),
    updateGlCode: () => of({ message: '' }),
  };

  const toastrMock = {
    success: () => {},
    error: () => {},
    info: () => {},
    warning: () => {},
  };

  const companySelectionMock = {
    selectedCompanyId$: of(null),
    getSelectedCompanyId: () => null,
    setSelectedCompanyId: () => {},
  };

  const userContextMock = {
    hasPermission: () => true,
    getUserId: () => 1,
    isAdmin: () => true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlCode],
      providers: [
        { provide: GlCodeService, useValue: glCodeServiceMock },
        { provide: ToastrService, useValue: toastrMock },
        { provide: CompanySelectionService, useValue: companySelectionMock },
        { provide: UserContextService, useValue: userContextMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlCode);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
