import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RoleService } from '../../services/role-service';
import { Spinner } from '../../shared/spinner/spinner';
import { CreateRoleRequest, Role } from '../../models/company-users.model';
import { ToastrService } from 'ngx-toastr';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';
import { Router } from '@angular/router';

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
  canCreateRoles = false;
  private allRoles: Role[] = [];
  pagination = this.createPagination();
  Math = Math;

  // ✅ Add constant for the required permission
  readonly REQUIRED_VIEW_COMPANY = 'VIEW_COMPANY';

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
        // update: 'EDIT_INVOICE',
        // delete: 'DELETE_INVOICE',
      },
    },
    {
      label: 'Payments',
      permissions: {
        view: 'VIEW_PAYMENTS',
        create: 'APPLY_PAYMENT',
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
      label: 'Collections',
      permissions: {
        view: 'VIEW_COLLECTIONS',
      },
      isSubRow: true,
    },
    {
      label: 'Follow-up Reminders',
      permissions: {
        view: 'VIEW_REMINDER',
        create: 'SEND_REMINDER',
      },
      isSubRow: true,
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
      label: 'Disputes',
      permissions: {
        view: 'VIEW_DISPUTE',
        create: 'CREATE_DISPUTE',
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
    private companySelection: CompanySelectionService,
    private userContext: UserContextService,
    private router: Router
  ) {
    this.canCreateRoles = this.userContext.hasPermission('CREATE_ROLES');
  }

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
        this.allRoles = res.data || [];
        this.pagination = this.createPagination();
        this.roles = this.applyPagination(this.allRoles, 0);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load roles', err);
        this.allRoles = [];
        this.roles = [];
        this.pagination = this.createPagination();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openModal() {
    if (!this.canCreateRoles) {
      return;
    }
    // ✅ Reset form with VIEW_COMPANY already selected
    this.addRoleForm.reset({
      name: '',
      description: '',
      permissions: [this.REQUIRED_VIEW_COMPANY],
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
    const formValue = this.addRoleForm.value as {
      name?: string | null;
      description?: string | null;
      permissions?: string[] | null;
    };

    const payload: CreateRoleRequest = {
      name: formValue.name ?? '',
      description: formValue.description ?? '',
      permissions: formValue.permissions ?? [],
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
    return this.getSelectedPermissions().includes(code);
  }

  // ✅ Check if permission is required (can't be unchecked)
  isPermissionRequired(code: string | undefined): boolean {
    return code === this.REQUIRED_VIEW_COMPANY;
  }

  togglePermissionSelection(code: string | undefined) {
    if (!code) return;

    // ✅ Prevent toggling required permissions
    if (this.isPermissionRequired(code)) return;

    const control = this.addRoleForm.get('permissions');
    if (!control) return;

    const current = this.getSelectedPermissions();
    if (current.includes(code)) {
      control.setValue(current.filter((val) => val !== code));
    } else {
      control.setValue([...current, code]);
    }
  }

  getSelectedCount(): number {
    return this.getSelectedPermissions().length;
  }

  private getSelectedPermissions(): string[] {
    const control = this.addRoleForm.get('permissions');
    const value = control?.value;
    return Array.isArray(value) ? (value as string[]) : [];
  }

  viewRole(role: Role) {
    if (!role?.id) {
      return;
    }
    this.router.navigate(['/admin/roles/details', role.id]);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const current = this.pagination.currentPage + 1;
    const total = this.pagination.totalPages;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current <= 3) {
        pages.push(2, 3, 4, -1, total);
      } else if (current >= total - 2) {
        pages.push(-1, total - 3, total - 2, total - 1, total);
      } else {
        pages.push(-1, current - 1, current, current + 1, -1, total);
      }
    }

    return pages;
  }

  goToPage(page: number) {
    this.roles = this.applyPagination(this.allRoles, page);
  }

  nextPage() {
    if (this.pagination.currentPage < this.pagination.totalPages - 1) {
      this.roles = this.applyPagination(this.allRoles, this.pagination.currentPage + 1);
    }
  }

  prevPage() {
    if (this.pagination.currentPage > 0) {
      this.roles = this.applyPagination(this.allRoles, this.pagination.currentPage - 1);
    }
  }

  private createPagination(pageSize = 10) {
    return {
      pageSize,
      currentPage: 0,
      totalPages: 0,
      totalItems: 0,
    };
  }

  private applyPagination(source: Role[], page: number): Role[] {
    this.pagination.totalItems = source.length;
    this.pagination.totalPages = this.pagination.totalItems
      ? Math.ceil(this.pagination.totalItems / this.pagination.pageSize)
      : 0;

    if (this.pagination.totalPages === 0) {
      this.pagination.currentPage = 0;
      return [];
    }

    this.pagination.currentPage = Math.min(
      Math.max(page, 0),
      this.pagination.totalPages - 1
    );

    const start = this.pagination.currentPage * this.pagination.pageSize;
    return source.slice(start, start + this.pagination.pageSize);
  }
}
