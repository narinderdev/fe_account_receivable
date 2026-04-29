import { Injectable } from '@angular/core';

type StoredCompanyRoleContext = {
  companyId: number | null;
  status?: string | null;
  roles: UserRoleEntry[];
};

type UserRoleEntry = {
  role?: {
    name?: string | null;
    permissions?: string[] | null;
  } | null;
};

type UserPayload = {
  id?: number | null;
  userCompanies?: Array<{
    company?: {
      id?: number | null;
    } | null;
    status?: string | null;
    roles?: UserRoleEntry[] | null;
  }> | null;
  userRoles?: UserRoleEntry[] | null;
};

export type UserContext = {
  userId: number | null;
  roleName: string;
  permissions: string[];
  isAdmin: boolean;
};

const STORAGE_KEY = 'userContext';
const COMPANY_STORAGE_KEY = 'selectedCompanyId';

const PERMISSION_ROUTE_ORDER: Array<{ permission: string; route: string }> = [
  { permission: 'VIEW_DASHBOARD', route: '/admin/dashboard' },
  { permission: 'VIEW_INVOICES', route: '/admin/invoices' },
  { permission: 'VIEW_CUSTOMERS', route: '/admin/customer' },
  { permission: 'VIEW_PAYMENTS', route: '/admin/payments' },
  { permission: 'VIEW_PROMISE_TO_PAY', route: '/admin/collections' },
  { permission: 'VIEW_MEMOS', route: '/admin/credit-memo' },
  { permission: 'VIEW_ACCOUNTING', route: '/admin/accounting' },
  { permission: 'VIEW_AGING_REPORTS', route: '/admin/ar-reports' },
  { permission: 'VIEW_INVOICE_REPORTS', route: '/admin/invoices-reports' },
  { permission: 'VIEW_PAYMENT_REPORTS', route: '/admin/payment-reports' },
  { permission: 'VIEW_COMPANY', route: '/admin/ar-company' },
  { permission: 'VIEW_PAYMENT_TERMS', route: '/admin/payment-terms' },
  { permission: 'VIEW_LATE_FEE', route: '/admin/late-fee' },
  { permission: 'VIEW_AGING_CODE', route: '/admin/aging-code' },
  { permission: 'VIEW_BANK_ACCOUNT', route: '/admin/accounts' },
  { permission: 'VIEW_INTEGRATION', route: '/admin/integration' },
  { permission: 'VIEW_INTEGRATIONS', route: '/admin/integration' },
  { permission: 'VIEW_AR_CODE', route: '/admin/ar-code' },
  { permission: 'VIEW_GL_CODE', route: '/admin/gl-code' },
  { permission: 'VIEW_USER', route: '/admin/users' },
  { permission: 'VIEW_MFA', route: '/admin/mfa' },
];

@Injectable({
  providedIn: 'root',
})
export class UserContextService {
  setFromLogin(user: UserPayload | null | undefined) {
    if (!user) {
      this.clear();
      return;
    }

    const context = this.buildContext(user);
    this.save(context);
  }

  setAdminDefaults(userId?: number | null) {
    const context: UserContext = {
      userId: userId ?? null,
      roleName: 'Admin',
      permissions: [],
      isAdmin: true,
    };

    this.save(context);
  }

  hasPermission(permission: string): boolean {
    if (!permission) {
      return false;
    }

    const context = this.getContext();
    return context.isAdmin || context.permissions.includes(permission);
  }

  isAdmin(): boolean {
    return this.getContext().isAdmin;
  }

  getPermissions(): string[] {
    return this.getContext().permissions;
  }

  getUserId(): number | null {
    return this.getContext().userId;
  }

  getDefaultRoute(): string {
    if (this.isAdmin()) {
      return '/admin/dashboard';
    }

    for (const entry of PERMISSION_ROUTE_ORDER) {
      if (this.hasPermission(entry.permission)) {
        return entry.route;
      }
    }

    return '/admin/dashboard';
  }

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COMPANY_STORAGE_KEY);
  }

  private buildContextFromRoles(
    userId: number | null | undefined,
    roles: UserRoleEntry[]
  ): UserContext {
    const allPermissions = roles
      .flatMap((entry) => {
        const perms = entry?.role?.permissions;
        if (Array.isArray(perms)) {
          return perms.filter((perm): perm is string => !!perm);
        }
        if (typeof perms === 'string') {
          return [perms];
        }
        return [];
      })
      .filter(Boolean);

    const uniquePermissions = Array.from(new Set(allPermissions));
    const hasAdminRole = roles.some((entry) => {
      const name = entry?.role?.name ?? '';
      return name.toLowerCase() === 'admin';
    });

    const firstRoleName = roles[0]?.role?.name ?? '';

    return {
      userId: typeof userId === 'number' ? userId : null,
      roleName: firstRoleName,
      permissions: uniquePermissions,
      isAdmin: hasAdminRole,
    };
  }

  private getContext(): UserContext {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return this.emptyContext();
    }

    try {
      const parsed = JSON.parse(raw);
      const companyContexts = this.parseCompanyContexts(parsed?.companies);
      if (companyContexts.length > 0) {
        const selectedCompanyId = this.getSelectedCompanyId();
        const selectedCompanyContext =
          companyContexts.find((entry) => entry.companyId === selectedCompanyId) ??
          companyContexts[0];
        return this.buildContextFromRoles(parsed?.userId, selectedCompanyContext.roles);
      }

      return {
        userId: typeof parsed?.userId === 'number' ? parsed.userId : null,
        roleName: typeof parsed?.roleName === 'string' ? parsed.roleName : '',
        permissions: Array.isArray(parsed?.permissions)
          ? parsed.permissions.filter((perm: unknown): perm is string => typeof perm === 'string')
          : [],
        isAdmin: Boolean(parsed?.isAdmin),
      };
    } catch {
      return this.emptyContext();
    }
  }

  private emptyContext(): UserContext {
    return {
      userId: null,
      roleName: '',
      permissions: [],
      isAdmin: false,
    };
  }

  private extractCompanyContexts(user: UserPayload): StoredCompanyRoleContext[] {
    const companyLinks = Array.isArray(user.userCompanies) ? user.userCompanies : [];
    return companyLinks
      .map((entry) => {
        const companyId = typeof entry?.company?.id === 'number' ? entry.company.id : null;
        const roles = Array.isArray(entry?.roles) ? entry.roles : [];
        return {
          companyId,
          status: typeof entry?.status === 'string' ? entry.status : null,
          roles,
        };
      })
      .filter((entry) => entry.companyId !== null || entry.roles.length > 0);
  }

  private parseCompanyContexts(value: unknown): StoredCompanyRoleContext[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((entry) => {
      const companyId =
        typeof (entry as { companyId?: unknown })?.companyId === 'number'
          ? ((entry as { companyId: number }).companyId ?? null)
          : null;
      const status =
        typeof (entry as { status?: unknown })?.status === 'string'
          ? ((entry as { status: string }).status ?? null)
          : null;
      const roles = Array.isArray((entry as { roles?: unknown[] })?.roles)
        ? (entry as { roles: UserRoleEntry[] }).roles
        : [];

      return {
        companyId,
        status,
        roles,
      };
    });
  }

  private getSelectedCompanyId(): number | null {
    const raw =
      typeof localStorage === 'undefined'
        ? null
        : localStorage.getItem(COMPANY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private save(context: UserContext & { companies?: StoredCompanyRoleContext[] }) {
    const payload = {
      ...context,
      companies: context.companies ?? [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  private buildContext(user: UserPayload): UserContext & { companies: StoredCompanyRoleContext[] } {
    const companyContexts = this.extractCompanyContexts(user);
    const selectedCompanyId = this.getSelectedCompanyId();
    const selectedCompanyContext =
      companyContexts.find((entry) => entry.companyId === selectedCompanyId) ?? companyContexts[0] ?? null;

    const selectedCompanyExists = companyContexts.some((entry) => entry.companyId === selectedCompanyId);
    if (
      companyContexts.length > 0 &&
      selectedCompanyContext?.companyId !== null &&
      (!selectedCompanyExists || selectedCompanyId === null)
    ) {
      localStorage.setItem(COMPANY_STORAGE_KEY, String(selectedCompanyContext.companyId));
    }

    const roles =
      selectedCompanyContext?.roles ??
      (Array.isArray(user.userRoles) ? user.userRoles : []);

    return {
      ...this.buildContextFromRoles(user.id, roles),
      companies: companyContexts,
    };
  }
}
