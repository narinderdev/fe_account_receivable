import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { CompanyService } from '../../services/company-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { RoleService } from '../../services/role-service';
import { ToastrService } from 'ngx-toastr';
import { UserContextService } from '../../services/user-context.service';

import { Users } from './users';
import { CompanyUser } from '../../models/company-users.model';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('Users', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'getUsers',
      'inviteUser',
    ]);
    const companySelection = new CompanySelectionService();
    const roleService = createSpyObj<RoleService>('RoleService', ['getRoles']);
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const userContext = createSpyObj<UserContextService>('UserContextService', [
      'hasPermission',
    ]);
    userContext.hasPermission.mockReturnValue(true);

    const instance = new Users(
      fb,
      companyService,
      companySelection,
      roleService,
      toastr,
      cdr,
      userContext
    );
    instance.inviteForm = fb.group({
      firstName: [''],
      lastName: [''],
      email: [''],
      roleIds: [''],
    });
    return instance;
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('logic helpers', () => {
    it('builds a fallback display name when first and last names exist', () => {
      const instance = createComponent();
      const name = instance.getUserName(createUser({ firstName: 'Ada', lastName: 'Lovelace' }));
      expect(name).toBe('Ada Lovelace');
    });

    it('maps user status to css class', () => {
      const instance = createComponent();
      expect(instance.getStatusClass(createUser({ status: 'ACTIVE' }))).toBe('status-open');
      expect(instance.getStatusClass(createUser({ status: 'UNKNOWN' }))).toBe('status-default');
    });
  });
});

function createUser(overrides: Partial<CompanyUser> = {}): CompanyUser {
  return {
    id: 1,
    name: '',
    firstName: 'First',
    lastName: 'Last',
    email: 'user@example.com',
    status: 'ACTIVE',
    role: { id: 1, name: 'Role', description: 'Role desc' },
    userRoles: [],
    ...overrides,
  };
}
