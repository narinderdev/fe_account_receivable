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

