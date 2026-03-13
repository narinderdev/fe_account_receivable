import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Role } from '../../../models/company-users.model';
import { CompanySelectionService } from '../../../services/company-selection.service';
import { RoleService } from '../../../services/role-service';
import { Loader } from '../../../shared/loader/loader';

interface PermissionColumn {
  view?: string;
  create?: string;
  update?: string;
  delete?: string;
  approve?: string;
}

interface PermissionRow {
  label: string;
  permissions: PermissionColumn;
  isSubRow?: boolean;
}

@Component({
  selector: 'app-roles-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, Loader],
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
      label: 'Customer',
      permissions: {
        view: 'VIEW_CUSTOMERS',
        create: 'CREATE_CUSTOMER',
        update: 'EDIT_CUSTOMER',
        delete: 'DELETE_CUSTOMER',
      },
    },
    {
      label: 'Invoice',
      permissions: {
        view: 'VIEW_INVOICES',
        create: 'CREATE_INVOICE',
        approve: 'APPROVE_INVOICE',
      },
    },
    {
      label: 'Payment',
      permissions: {
        view: 'VIEW_PAYMENTS',
        create: 'APPLY_PAYMENT',
        approve: 'APPROVE_PAYMENT',
      },
    },
    {
      label: 'Integration',
      permissions: {
        view: 'VIEW_INTEGRATION',
      },
    },
    {
      label: 'Credit Memo',
      permissions: {
        view: 'VIEW_MEMOS',
        create: 'CREATE_MEMOS',
        approve: 'APPROVE_MEMOS',
      },
    },
    {
      label: 'Aging & Report',
      permissions: {},
    },
    {
      label: 'Aging Report',
      permissions: {
        view: 'VIEW_AGING_REPORTS',
      },
      isSubRow: true,
    },
    {
      label: 'Invoice Report',
      permissions: {
        view: 'VIEW_INVOICE_REPORTS',
      },
      isSubRow: true,
    },
    {
      label: 'Payment Report',
      permissions: {
        view: 'VIEW_PAYMENT_REPORTS',
      },
      isSubRow: true,
    },
    {
      label: 'Collection',
      permissions: {},
    },
    {
      label: 'Collection',
      permissions: {
        view: 'VIEW_COLLECTIONS',
      },
      isSubRow: true,
    },
    {
      label: 'Follow-up Reminder',
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
      label: 'Dispute',
      permissions: {
        view: 'VIEW_DISPUTE',
        create: 'CREATE_DISPUTE',
      },
      isSubRow: true,
    },
    {
      label: 'Write-Off',
      permissions: {
        view: 'VIEW_WRITE_OFF',
        create: 'CREATE_WRITE_OFF',
        approve: 'APPROVE_WRITE_OFF',
      },
      isSubRow: true,
    },
    {
      label: 'Security',
      permissions: {},
    },
    {
      label: 'User',
      permissions: {
        view: 'VIEW_USER',
        create: 'INVITE_USER',
      },
      isSubRow: true,
    },
    {
      label: 'Role',
      permissions: {
        view: 'VIEW_ROLES',
        create: 'CREATE_ROLES',
        update: 'UPDATE_ROLE',
      },
      isSubRow: true,
    },
    {
      label: 'MFA',
      permissions: {
        view: 'VIEW_MFA',
      },
      isSubRow: true,
    },
    {
      label: 'Security Report',
      permissions: {
        view: 'VIEW_SECURITY_REPORT',
      },
      isSubRow: true,
    },
    {
      label: 'Setup / Admin',
      permissions: {},
    },
    {
      label: 'AR Company',
      permissions: {
        view: 'VIEW_COMPANY',
        create: 'CREATE_COMPANY',
        update: 'UPDATE_COMPANY',
        delete: 'DELETE_COMPANY',
      },
      isSubRow: true,
    },
    {
      label: 'GL Code',
      permissions: {
        view: 'VIEW_GL_CODE',
        create: 'CREATE_GL_CODE',
        update: 'UPDATE_GL_CODE',
      },
      isSubRow: true,
    },
    {
      label: 'Account',
      permissions: {
        view: 'VIEW_BANK_ACCOUNT',
        create: 'CREATE_BANK_ACCOUNT',
        update: 'UPDATE_BANK_ACCOUNT',
      },
      isSubRow: true,
    },
    {
      label: 'Payment Term',
      permissions: {
        view: 'VIEW_PAYMENT_TERMS',
        create: 'CREATE_PAYMENT_TERMS',
        update: 'UPDATE_PAYMENT_TERMS',
        delete: 'DELETE_PAYMENT_TERMS',
      },
      isSubRow: true,
    },
    {
      label: 'Late Fee',
      permissions: {
        view: 'VIEW_LATE_FEE',
        create: 'CREATE_LATE_FEE',
        update: 'UPDATE_LATE_FEE',
        delete: 'DELETE_LATE_FEE',
      },
      isSubRow: true,
    },
    {
      label: 'Aging Code',
      permissions: {
        view: 'VIEW_AGING_CODE',
        create: 'CREATE_AGING_CODE',
        update: 'UPDATE_AGING_CODE',
        delete: 'DELETE_AGING_CODE',
      },
      isSubRow: true,
    },
    {
      label: 'AR Code',
      permissions: {
        view: 'VIEW_AR_CODE',
        create: 'CREATE_AR_CODE',
        update: 'UPDATE_AR_CODE',
        delete: 'DELETE_AR_CODE',
      },
      isSubRow: true,
    },
    
  ];

  private destroy$ = new Subject<void>();
  private companyId: number | null = null;
  private permissionLookup = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private roleService: RoleService,
    private companySelection: CompanySelectionService,
    private cdr: ChangeDetectorRef,
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
