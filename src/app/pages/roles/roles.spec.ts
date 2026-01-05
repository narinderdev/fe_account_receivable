import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { RoleService } from '../../services/role-service';
import { ToastrService } from 'ngx-toastr';
import { CompanySelectionService } from '../../services/company-selection.service';
import { UserContextService } from '../../services/user-context.service';

import { Roles } from './roles';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('Roles', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const roleService = createSpyObj<RoleService>('RoleService', ['getRoles', 'createRoles']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    const userContext = createSpyObj<UserContextService>('UserContextService', [
      'hasPermission',
    ]);
    userContext.hasPermission.mockReturnValue(true);
    const router = createSpyObj<Router>('Router', ['navigate']);

    const instance = new Roles(
      fb,
      roleService,
      cdr,
      toastr,
      companySelection,
      userContext,
      router
    );
    instance['addRoleForm'] = fb.group({
      name: [''],
      description: [''],
      permissions: [['VIEW_COMPANY']],
    });
    return instance;
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('permission helpers', () => {
    it('marks VIEW_COMPANY as a required permission', () => {
      const instance = createComponent();
      expect(instance.isPermissionRequired('VIEW_COMPANY')).toBe(true);
      expect(instance.isPermissionRequired('CREATE_CUSTOMER')).toBe(false);
    });

    it('toggles optional permissions without affecting required ones', () => {
      const instance = createComponent();
      instance.togglePermissionSelection('CREATE_CUSTOMER');
      expect(instance.getSelectedCount()).toBe(2);

      instance.togglePermissionSelection('CREATE_CUSTOMER');
      expect(instance.getSelectedCount()).toBe(1);

      instance.togglePermissionSelection('VIEW_COMPANY');
      expect(instance.getSelectedCount()).toBe(1);
    });
  });
});