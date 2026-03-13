import { Injectable } from '@angular/core';

type UserRoleEntry = {
  role?: {
    name?: string | null;
    permissions?: string[] | null;
  } | null;
};

type UserPayload = {
  id?: number | null;
  userRoles?: UserRoleEntry[] | null;
};

export type UserContext = {
  userId: number | null;
  roleName: string;
  permissions: string[];
  isAdmin: boolean;
};

const STORAGE_KEY = 'userContext';

const PERMISSION_ROUTE_ORDER: Array<{ permission: string; route: string }> = [
  { permission: 'VIEW_DASHBOARD', route: '/admin/dashboard' },
  { permission: 'VIEW_INVOICES', route: '/admin/invoices' },
  { permission: 'VIEW_CUSTOMERS', route: '/admin/customer' },
  { permission: 'VIEW_PAYMENTS', route: '/admin/payments' },
  { permission: 'VIEW_PROMISE_TO_PAY', route: '/admin/collections' },
  { permission: 'VIEW_MEMOS', route: '/admin/credit-memo' },
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
  }

  private buildContext(user: UserPayload): UserContext {
    const roles = Array.isArray(user.userRoles) ? user.userRoles : [];
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
      userId: typeof user.id === 'number' ? user.id : null,
      roleName: firstRoleName,
      permissions: uniquePermissions,
      isAdmin: hasAdminRole,
    };
  }

  private save(context: UserContext) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  }

  private getContext(): UserContext {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return this.emptyContext();
    }

    try {
      const parsed = JSON.parse(raw);
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
}




