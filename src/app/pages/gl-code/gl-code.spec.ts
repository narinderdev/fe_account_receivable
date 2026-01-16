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
    getGlCode: jasmine.createSpy('getGlCode').and.returnValue(of({ data: [] })),
    createGlCode: jasmine.createSpy('createGlCode').and.returnValue(of({ message: '' })),
    updateGlCode: jasmine.createSpy('updateGlCode').and.returnValue(of({ message: '' })),
  };

  const toastrMock = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    info: jasmine.createSpy('info'),
    warning: jasmine.createSpy('warning'),
  };

  const companySelectionMock = {
    selectedCompanyId$: of(null),
    getSelectedCompanyId: jasmine.createSpy('getSelectedCompanyId').and.returnValue(null),
    setSelectedCompanyId: jasmine.createSpy('setSelectedCompanyId'),
  };

  const userContextMock = {
    hasPermission: jasmine.createSpy('hasPermission').and.returnValue(true),
    getUserId: jasmine.createSpy('getUserId').and.returnValue(1),
    isAdmin: jasmine.createSpy('isAdmin').and.returnValue(true),
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
