import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ArCodeService } from '../../services/ar-code-service';
import { UserContextService } from '../../services/user-context.service';
import { createSpy } from 'src/testing/spy-helpers';

import { ArCodes } from './ar-codes';

describe('ArCodes', () => {
  let component: ArCodes;
  let fixture: ComponentFixture<ArCodes>;

  const createArCodeServiceMock = () => ({
    getCode: createSpy('getCode'),
    createCode: createSpy('createCode'),
    updateCode: createSpy('updateCode'),
    deleteCode: createSpy('deleteCode'),
    activateCode: createSpy('activateCode'),
    deactivateCode: createSpy('deactivateCode'),
  });

  const createToastrMock = () => ({
    success: createSpy('success'),
    error: createSpy('error'),
    info: createSpy('info'),
  });

  const createUserContextMock = () => {
    const permissions = new Set(['VIEW_CODE', 'CREATE_CODE', 'UPDATE_CODE', 'DELETE_CODE']);
    return {
      hasPermission: (permission: string) => permissions.has(permission),
    };
  };

  beforeEach(async () => {
    const arCodeServiceMock = createArCodeServiceMock();
    arCodeServiceMock.getCode.mockReturnValue(of({ data: [] }));
    arCodeServiceMock.createCode.mockReturnValue(of({}));
    arCodeServiceMock.updateCode.mockReturnValue(of({}));
    arCodeServiceMock.deleteCode.mockReturnValue(of({}));
    arCodeServiceMock.activateCode.mockReturnValue(of({}));
    arCodeServiceMock.deactivateCode.mockReturnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [ArCodes],
      providers: [
        { provide: ArCodeService, useValue: arCodeServiceMock },
        { provide: ToastrService, useFactory: createToastrMock },
        { provide: UserContextService, useFactory: createUserContextMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArCodes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
