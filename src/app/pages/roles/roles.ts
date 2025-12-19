import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RoleService } from '../../services/role-service';
import { Spinner } from '../../shared/spinner/spinner';
import { Role } from '../../models/company-users.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  templateUrl: './roles.html',
  styleUrls: ['./roles.css'],
})
export class Roles implements OnInit {
  roles: Role[] = [];
  permissions: any[] = [];
  isLoading = false;
  isModalOpen = false;
  isSaving = false;
  submitted = false;
  addRoleForm!: FormGroup;
  activePermissionTab = 'dashboard';
  tabPermissions: Record<string, string[]> = {};

  permissionTabs = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      permissions: ['VIEW_DASHBOARD'],
    },
    {
      key: 'customers',
      label: 'Customers',
      permissions: [
        'VIEW_CUSTOMERS',
        'VIEW_CUSTOMER_DETAILS',
        'CREATE_CUSTOMER',
        'EDIT_CUSTOMER',
        'DELETE_CUSTOMER',
      ],
    },
    {
      key: 'invoices',
      label: 'Invoices',
      permissions: [
        'VIEW_INVOICES',
        'VIEW_INVOICE_DETAILS',
        'CREATE_INVOICE',
        'EDIT_INVOICE',
        'DELETE_INVOICE',
        'SEND_INVOICE',
      ],
    },
    {
      key: 'payments',
      label: 'Payments',
      permissions: ['VIEW_PAYMENTS', 'VIEW_PAYMENT_DETAILS', 'CREATE_PAYMENT', 'APPLY_PAYMENT'],
    },
    {
      key: 'reports',
      label: 'Aging & Reports',
      permissions: ['VIEW_AGING_REPORTS', 'EXPORT_AGING_REPORT', 'EXPORT_REPORTS'],
    },
    {
      key: 'collections',
      label: 'Collections & Disputes',
      permissions: [
        'VIEW_COLLECTIONS',
        'VIEW_PROMISE_TO_PAY',
        'CREATE_PROMISE_TO_PAY',
        'UPDATE_PROMISE_TO_PAY',
        'VIEW_DISPUTES',
        'CREATE_DISPUTE',
        'RESOLVE_DISPUTE',
      ],
    },
    {
      key: 'integration',
      label: 'Integration',
      permissions: [],
    },
    {
      key: 'setup',
      label: 'Setup / Admin',
      permissions: [
        'VIEW_SETUP_ADMIN',
        'MANAGE_COMPANY_SETTINGS',
        'MANAGE_USERS',
        'MANAGE_ROLES',
        'INVITE_USER',
      ],
    },
  ];

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.addRoleForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      permissions: [[]],
    });

    this.loadRoles();
  }

  loadRoles() {
    this.isLoading = true;

    this.roleService.getRoles().subscribe({
      next: (res) => {
        this.roles = res.data; 
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load roles', err);
        this.roles = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadPermissions() {
    if (this.permissions.length) return;

    this.roleService.getPermissions().subscribe({
      next: (res) => {
        this.permissions = res?.data || res || [];
        this.buildTabPermissions();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load permissions', err);
        this.permissions = [];
        this.cdr.detectChanges();
      },
    });
  }

  permissionValue(perm: any) {
    if (typeof perm === 'string') {
      return perm;
    }
    return perm?.id ?? perm?.code ?? perm;
  }

  permissionLabel(perm: any) {
    let raw: any;
    if (typeof perm === 'string') {
      raw = perm;
    } else {
      raw = perm?.name || perm?.description || perm?.code || perm;
    }
    if (typeof raw !== 'string') {
      return raw;
    }

    return raw
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  openModal() {
    this.addRoleForm.reset({
      name: '',
      description: '',
      permissions: [],
    });

    this.submitted = false;
    this.isModalOpen = true;
    const fallbackTab = this.permissionTabs.find((tab) => this.getPermissionsForTab(tab.key).length);
    this.activePermissionTab = fallbackTab?.key || this.permissionTabs[0].key;
    this.loadPermissions();
    this.cdr.detectChanges();
  }

  closeModal() {
    this.isModalOpen = false;
    this.cdr.detectChanges();
  }

  saveRole() {
    this.submitted = true;
    if (this.addRoleForm.invalid) return;

    this.isSaving = true;
    const formValue = this.addRoleForm.value;

    const payload = {
      name: formValue.name,
      description: formValue.description,
      permissions: formValue.permissions || [],
    };

    this.roleService.createRoles(payload).subscribe({
      next: (res) => {
        this.toastr.success(res?.message || 'Role created successfully');
        this.isSaving = false;
        this.isModalOpen = false;
        this.loadRoles();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to create role', err);
        this.toastr.error('Failed to create role');
        this.isSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  isPermissionSelected(id: any) {
    const selected = this.addRoleForm.get('permissions')?.value || [];
    return selected.includes(id);
  }

  togglePermissionSelection(id: any) {
    const control = this.addRoleForm.get('permissions');
    if (!control) return;

    const current = control.value || [];
    if (current.includes(id)) {
      control.setValue(current.filter((val: any) => val !== id));
    } else {
      control.setValue([...current, id]);
    }
  }

  selectedPermissionLabels(): string[] {
    const selected = this.addRoleForm.get('permissions')?.value || [];
    return selected.map((perm: any) => this.permissionLabel(perm));
  }

  getPermissionsForTab(tabKey: string): string[] {
    return this.tabPermissions[tabKey] || [];
  }

  setActiveTab(tabKey: string) {
    this.activePermissionTab = tabKey;
    this.cdr.detectChanges();
  }

  private buildTabPermissions() {
    const available = new Set(
      this.permissions.map((perm) => this.permissionValue(perm))
    );

    this.tabPermissions = {};
    this.permissionTabs.forEach((tab) => {
      this.tabPermissions[tab.key] = tab.permissions.filter((perm) => available.has(perm));
    });

    const currentList = this.tabPermissions[this.activePermissionTab];
    if (!currentList || currentList.length === 0) {
      const fallback = this.permissionTabs.find((tab) => (this.tabPermissions[tab.key] || []).length > 0);
      this.activePermissionTab = fallback?.key || this.permissionTabs[0].key;
    }
  }
}
