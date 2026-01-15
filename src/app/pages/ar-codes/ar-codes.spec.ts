import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ArCodeService } from '../../services/ar-code-service';
import { UserContextService } from '../../services/user-context.service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { ArCodeEntity } from '../../models/ar-code.model';
import { GlCodeService } from '../../services/gl-code-service';

import { ArCodes } from './ar-codes';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('ArCodes', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const apiResponse = <T>(data: T) => ({
      statusCode: 200,
      status: 'success',
      message: 'ok',
      data,
    });
    const arCodeService = createSpyObj<ArCodeService>('ArCodeService', [
      'getCode',
      'createCode',
      'updateCode',
      'deleteCode',
      'activateCode',
      'deactivateCode',
      'arglMapping',
    ]);
    arCodeService.getCode.mockReturnValue(of(apiResponse<ArCodeEntity[]>([])));
    arCodeService.createCode.mockReturnValue(
      of(
        apiResponse<ArCodeEntity>({
          id: 1,
          code: 'TEST',
          name: 'Test',
          description: '',
          codeType: 'GL',
          createdAt: '',
          updatedAt: '',
          active: true,
          glMappingStatus: 'CONFIGURED',
        })
      )
    );
    arCodeService.updateCode.mockReturnValue(
      of(
        apiResponse<ArCodeEntity>({
          id: 1,
          code: 'TEST',
          name: 'Updated',
          description: 'desc',
          codeType: 'GL',
          createdAt: '',
          updatedAt: '',
          active: true,
          glMappingStatus: 'CONFIGURED',
        })
      )
    );
    arCodeService.deleteCode.mockReturnValue(of(apiResponse<null>(null)));
    arCodeService.activateCode.mockReturnValue(
      of(
        apiResponse<ArCodeEntity>({
          id: 1,
          code: 'TEST',
          name: 'Test',
          description: '',
          codeType: 'GL',
          createdAt: '',
          updatedAt: '',
          active: true,
          glMappingStatus: 'CONFIGURED',
        })
      )
    );
    arCodeService.deactivateCode.mockReturnValue(
      of(
        apiResponse<ArCodeEntity>({
          id: 1,
          code: 'TEST',
          name: 'Test',
          description: '',
          codeType: 'GL',
          createdAt: '',
          updatedAt: '',
          active: false,
          glMappingStatus: 'MISSING',
        })
      )
    );
    arCodeService.arglMapping.mockReturnValue(
      of(
        apiResponse<ArCodeEntity>({
          id: 1,
          code: 'TEST',
          name: 'Test',
          description: '',
          codeType: 'GL',
          createdAt: '',
          updatedAt: '',
          active: true,
          glMappingStatus: 'CONFIGURED',
        })
      )
    );
    const glCodeService = createSpyObj<GlCodeService>('GlCodeService', ['getGlCode']);
    glCodeService.getGlCode.mockReturnValue(of(apiResponse([])));
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'info', 'warning']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const userContext = createSpyObj<UserContextService>('UserContextService', ['hasPermission', 'getUserId']);
    userContext.hasPermission.mockReturnValue(true);
    userContext.getUserId.mockReturnValue(1);
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;

    const component = new ArCodes(
      fb,
      arCodeService,
      toastr,
      cdr,
      userContext,
      companySelection,
      glCodeService
    );

    return {
      component,
      arCodeService,
    };
  };

  it('should create', () => {
    const { component } = createComponent();
    expect(component).toBeTruthy();
  });

  it('builds update payloads only with changed fields', () => {
    const { component } = createComponent();
    const internals = component as unknown as ArCodesInternals;
    const original = {
      id: 1,
      arCode: 'GL1',
      codeName: 'General Ledger',
      codeType: 'GL',
      description: 'Original',
      status: 'ACTIVE',
    };
    const updated = {
      ...original,
      codeName: 'Updated Name',
      description: 'New description',
    };

    const payload = internals.buildUpdatePayload(original, updated);

    expect(payload).toEqual({
      name: 'Updated Name',
      description: 'New description',
    });
  });

  it('returns formatted labels for known code types', () => {
    const { component } = createComponent();

    expect(component.getCodeTypeLabel('BANK_CASH')).toBe('Bank Cash');
    expect(component.getCodeTypeLabel('UNKNOWN_CODE')).toBe('UNKNOWN_CODE');
    expect(component.getCodeTypeLabel(undefined)).toBe('—');
  });

  it('maps API entities into view records with status', () => {
    const { component } = createComponent();
    const internals = component as unknown as ArCodesInternals;

    const record = internals.mapEntityToRecord({
      id: 9,
      code: 'AC',
      name: 'Account Code',
      description: 'desc',
      codeType: 'MEMO',
      glMappingStatus: 'CONFIGURED',
      active: false,
    });

    expect(record).toMatchObject({
      id: 9,
      arCode: 'AC',
      codeName: 'Account Code',
      codeType: 'MEMO',
      description: 'desc',
      glMappingStatus: 'CONFIGURED',
      status: 'INACTIVE',
    });
  });
});

type ArCodesInternals = {
  buildUpdatePayload(
    original: {
      arCode: string;
      codeName: string;
      codeType?: string;
      description: string;
    },
    updated: {
      arCode: string;
      codeName: string;
      codeType?: string;
      description: string;
    }
  ): Record<string, unknown>;
  mapEntityToRecord(entity: Record<string, unknown>): {
    id?: number;
    arCode: string;
    codeName: string;
    codeType?: string;
    description: string;
    glMappingStatus?: string;
    status: string;
  };
};
