import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { RoleService } from '../../../services/role-service';
import { RolesResponse } from '../../../models/company-users.model';
import { CompanySelectionService } from '../../../services/company-selection.service';

import { RolesDetail } from './roles-detail';
import { createSpy, createSpyObj } from '../../../../testing/spy-helpers';

describe('RolesDetail', () => {
  const createComponent = () => {
    const route = {
      snapshot: { paramMap: { get: () => '5' } },
    } as unknown as ActivatedRoute;
    const roleService = createSpyObj<RoleService>('RoleService', ['getRoles']);
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;

    return new RolesDetail(route, roleService, companySelection, cdr);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  it('knows when a permission code is missing', () => {
    const instance = createComponent();
    (instance as any).permissionLookup = new Set(['VIEW_USER']);
    expect(instance.hasPermission('VIEW_USER')).toBe(true);
    expect(instance.hasPermission('UNKNOWN')).toBe(false);
    expect(instance.hasPermission(undefined)).toBe(false);
  });

  it('builds accessible tabs from role permissions', () => {
    const route = {
      snapshot: { paramMap: { get: () => '9' } },
    } as unknown as ActivatedRoute;
    const roleService = createSpyObj<RoleService>('RoleService', ['getRoles']);
    const response: RolesResponse = {
      statusCode: 200,
      status: 'success',
      message: 'ok',
      data: [{ id: 9, name: 'Foo', description: '', permissions: ['VIEW_DASHBOARD', 'VIEW_CUSTOMERS'] }],
    };
    roleService.getRoles.mockReturnValue(of(response));
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;

    const instance = new RolesDetail(route, roleService, companySelection, cdr);
    (instance as any).companyId = 2;
    (instance as any).roleId = 9;
    (instance as any).loadRoleDetails();

    expect(instance.accessibleTabs).toContain('Dashboard');
    expect(instance.accessibleTabs).toContain('Customers');
  });
});