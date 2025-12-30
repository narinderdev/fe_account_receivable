import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Role } from '../../../models/company-users.model';
import { CompanySelectionService } from '../../../services/company-selection.service';
import { RoleService } from '../../../services/role-service';
import { Spinner } from '../../../shared/spinner/spinner';

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
  selector: 'app-roles-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, Spinner],
  templateUrl: './roles-detail.html',
  styleUrls: ['./roles-detail.css'],
})
export class RolesDetail implements OnInit, OnDestroy {
  roleId: number | null = null;
  role: Role | null = null;
  loading = false;
  accessibleTabs: string[] = [];
  totalPermissions = 0;

  permissionRows: PermissionRow[] = [
    {
      label: 'Dashboard',
      permissions: { view: 'VIEW_DASHBOARD' },
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
        create: 'INVITE_USER',
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
  private companyId: number | null = null;
  private permissionLookup = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private roleService: RoleService,
    private companySelection: CompanySelectionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.roleId = Number(this.route.snapshot.paramMap.get('roleId'));

    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;

      if (this.companyId === nextId) {
        return;
      }

      this.companyId = nextId;
      if (this.companyId && this.roleId) {
        this.loadRoleDetails();
      } else {
        this.role = null;
        this.accessibleTabs = [];
        this.permissionLookup = new Set();
        this.totalPermissions = 0;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasPermission(code?: string): boolean {
    if (!code) {
      return false;
    }
    return this.permissionLookup.has(code);
  }

  private loadRoleDetails() {
    if (!this.companyId || !this.roleId) {
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.roleService.getRoles(this.companyId).subscribe({
      next: (res) => {
        const roleList = Array.isArray(res?.data) ? res.data : [];
        this.role = roleList.find((item) => item.id === this.roleId) || null;
        const permissions = this.role?.permissions ?? [];
        this.permissionLookup = new Set(permissions);
        this.totalPermissions = permissions.length;
        this.accessibleTabs = this.permissionRows
          .filter((row) => row.permissions.view && this.hasPermission(row.permissions.view))
          .map((row) => row.label);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.role = null;
        this.permissionLookup = new Set();
        this.accessibleTabs = [];
        this.totalPermissions = 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
