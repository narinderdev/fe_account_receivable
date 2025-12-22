import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RoleService } from '../../services/role-service';
import { Spinner } from '../../shared/spinner/spinner';
import { Role } from '../../models/company-users.model';
import { ToastrService } from 'ngx-toastr';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';

interface PermissionColumn {
  view?: string;
  create?: string;
  update?: string;
  delete?: string;
}

interface PermissionRow {
  label: string;
  permissions: PermissionColumn;
  isSubRow?: boolean;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  templateUrl: './roles.html',
  styleUrls: ['./roles.css'],
})
export class Roles implements OnInit, OnDestroy {
  roles: Role[] = [];
  isLoading = false;
  isModalOpen = false;
  isSaving = false;
  submitted = false;
  addRoleForm!: FormGroup;

  permissionRows: PermissionRow[] = [
    {
      label: 'Dashboard',
      permissions: {
        view: 'VIEW_DASHBOARD',
      },
    },
    {
      label: 'Customers',
      permissions: {
        view: 'VIEW_CUSTOMERS',
        create: 'CREATE_CUSTOMER',
        update: 'EDIT_CUSTOMER',
        delete: 'DELETE_CUSTOMER',
      },
    },
    {
      label: 'Invoices',
      permissions: {
        view: 'VIEW_INVOICES',
        create: 'CREATE_INVOICE',
        update: 'EDIT_INVOICE',
        delete: 'DELETE_INVOICE',
      },
    },
    {
      label: 'Payments',
      permissions: {
        view: 'VIEW_PAYMENTS',
        create: 'APPLY_PAYMENT', // Receive treated as Create
      },
    },
    {
      label: 'Aging & Reports',
      permissions: {
        view: 'VIEW_AGING_REPORTS',
      },
    },
    {
      label: 'Collections',
      permissions: {},
    },
    {
      label: 'Promise to Pay',
      permissions: {
        view: 'VIEW_PROMISE_TO_PAY',
        create: 'CREATE_PROMISE_TO_PAY',
      },
      isSubRow: true,
    },
    {
      label: 'Company',
      permissions: {
        view: 'VIEW_COMPANY',
        create: 'CREATE_COMPANY',
        update: 'UPDATE_COMPANY',
        delete: 'DELETE_COMPANY',
      },
    },
    {
      label: 'Users',
      permissions: {
        view: 'VIEW_USER',
        create: 'INVITE_USER', // Invite treated as Create
      },
    },
    {
      label: 'Roles',
      permissions: {
        view: 'VIEW_ROLES',
        create: 'CREATE_ROLES',
      },
    },
  ];

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private companySelection: CompanySelectionService
  ) {}

  ngOnInit() {
    this.addRoleForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      permissions: [[]],
    });

    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;

      if (this.activeCompanyId === nextId) {
        return;
      }

      this.activeCompanyId = nextId;

      if (this.activeCompanyId) {
        this.loadRoles(this.activeCompanyId);
      } else {
        this.roles = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadRoles(companyId: number) {
    this.isLoading = true;

    this.roleService.getRoles(companyId).subscribe({
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

    if (!this.activeCompanyId) return;

    this.roleService.createRoles(this.activeCompanyId, payload).subscribe({
      next: (res) => {
        this.toastr.success(res?.message || 'Role created successfully');
        this.isSaving = false;
        this.isModalOpen = false;
        if (this.activeCompanyId) {
          this.loadRoles(this.activeCompanyId);
        }
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

  isPermissionSelected(code: string | undefined): boolean {
    if (!code) return false;
    const selected = this.addRoleForm.get('permissions')?.value || [];
    return selected.includes(code);
  }

  togglePermissionSelection(code: string | undefined) {
    if (!code) return;

    const control = this.addRoleForm.get('permissions');
    if (!control) return;

    const current = control.value || [];
    if (current.includes(code)) {
      control.setValue(current.filter((val: any) => val !== code));
    } else {
      control.setValue([...current, code]);
    }
  }

  getSelectedCount(): number {
    const selected = this.addRoleForm.get('permissions')?.value || [];
    return selected.length;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
