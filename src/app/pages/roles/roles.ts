import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RoleService } from '../../services/role-service';
import { Spinner } from '../../shared/spinner/spinner';
import { Role } from '../../models/company-users.model';
import { ToastrService } from 'ngx-toastr';

interface Permission {
  code: string;
  label: string;
}

interface PermissionTab {
  key: string;
  label: string;
  permissions: Permission[];
  subtabs?: {
    key: string;
    label: string;
    permissions: Permission[];
  }[];
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  templateUrl: './roles.html',
  styleUrls: ['./roles.css'],
})
export class Roles implements OnInit {
  roles: Role[] = [];
  isLoading = false;
  isModalOpen = false;
  isSaving = false;
  submitted = false;
  addRoleForm!: FormGroup;

  permissionTabs: PermissionTab[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      permissions: [{ code: 'VIEW_DASHBOARD', label: 'View' }],
    },
    {
      key: 'customers',
      label: 'Customers',
      permissions: [
        { code: 'VIEW_CUSTOMERS', label: 'View' },
        { code: 'CREATE_CUSTOMER', label: 'Add' },
        { code: 'EDIT_CUSTOMER', label: 'Update' },
        { code: 'DELETE_CUSTOMER', label: 'Delete' },
      ],
    },
    {
      key: 'invoices',
      label: 'Invoices',
      permissions: [
        { code: 'VIEW_INVOICES', label: 'View' },
        { code: 'CREATE_INVOICE', label: 'Create' },
      ],
    },
    {
      key: 'payments',
      label: 'Payments',
      permissions: [
        { code: 'VIEW_PAYMENTS', label: 'View' },
        { code: 'RECEIVE_PAYMENT', label: 'Receive' },
      ],
    },
    {
      key: 'reports',
      label: 'Aging & Reports',
      permissions: [{ code: 'VIEW_AGING_REPORTS', label: 'View' }],
    },
    {
      key: 'collections',
      label: 'Collections & Disputes',
      permissions: [],
      subtabs: [
        {
          key: 'promise_to_pay',
          label: 'Promise to Pay',
          permissions: [
            { code: 'VIEW_PROMISE_TO_PAY', label: 'View' },
            { code: 'CREATE_PROMISE_TO_PAY', label: 'Create' },
          ],
        },
        // {
        //   key: 'reminders',
        //   label: 'Reminders',
        //   permissions: [],
        // },
      ],
    },
    {
      key: 'company',
      label: 'Company',
      permissions: [
        { code: 'VIEW_COMPANY', label: 'View' },
        { code: 'CREATE_COMPANY', label: 'Add' },
        { code: 'EDIT_COMPANY', label: 'Update' },
        { code: 'DELETE_COMPANY', label: 'Delete' },
      ],
    },
    {
      key: 'users',
      label: 'Users',
      permissions: [
        { code: 'VIEW_USERS', label: 'View' },
        { code: 'INVITE_USER', label: 'Invite' },
      ],
    },
    {
      key: 'roles',
      label: 'Roles',
      permissions: [
        { code: 'VIEW_ROLES', label: 'View' },
        { code: 'CREATE_ROLE', label: 'Create' },
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

  openModal() {
    this.addRoleForm.reset({
      name: '',
      description: '',
      permissions: [],
    });

    this.submitted = false;
    this.isModalOpen = true;
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

  isPermissionSelected(code: string) {
    const selected = this.addRoleForm.get('permissions')?.value || [];
    return selected.includes(code);
  }

  togglePermissionSelection(code: string) {
    const control = this.addRoleForm.get('permissions');
    if (!control) return;

    const current = control.value || [];
    if (current.includes(code)) {
      control.setValue(current.filter((val: any) => val !== code));
    } else {
      control.setValue([...current, code]);
    }
  }

  selectedPermissionLabels(): string[] {
    const selected = this.addRoleForm.get('permissions')?.value || [];
    const allPermissions: Permission[] = [];

    this.permissionTabs.forEach((tab) => {
      allPermissions.push(...tab.permissions);
      if (tab.subtabs) {
        tab.subtabs.forEach((subtab) => {
          allPermissions.push(...subtab.permissions);
        });
      }
    });

    return selected.map((code: string) => {
      const perm = allPermissions.find((p) => p.code === code);
      return perm ? perm.label : code;
    });
  }
}
