// ===========================================================
// ======================= USERS =============================
// ===========================================================

import { CompanyEntity } from './company.model';

// Role object inside each user
export interface CompanyUserRole {
  id: number;
  name: string;
  description: string;
  permissions?: string[];
  hibernateLazyInitializer?: Record<string, unknown>;
}

export interface CompanyUserRoleAssignment {
  id: number;
  role: CompanyUserRole | null;
}

export interface CompanyUserCompanyLink {
  id: number;
  company: CompanyEntity & {
    hibernateLazyInitializer?: Record<string, unknown>;
  };
  status?: string;
  roles?: CompanyUserRoleAssignment[];
}

// A single company user
export interface CompanyUser {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  status?: string;
  role?: CompanyUserRole | null;
  userRoles?: CompanyUserRoleAssignment[];
  userCompanies?: CompanyUserCompanyLink[];
  userStatus?: string;
  passwordChangedAt?: string | null;
  forcePasswordChange?: boolean;
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  mfaEnabled?: boolean;
  mfaEnabledAt?: string | null;
  mfaEmailVerified?: boolean;
}

// Response for GET /api/companies/users/{companyId}
export interface CompanyUsersResponse {
  statusCode: number;
  status: string;
  message: string;
  data: CompanyUser[];
}

// ===========================================================
// ======================== ROLES ============================
// ===========================================================

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions?: string[];
}

// Response for GET /api/roles
export interface RolesResponse {
  statusCode: number;
  status: string;
  message: string;
  data: Role[];
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  permissions: string[];
}


// Payload sent when inviting a new user
export interface InviteUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  roleIds: number[];
}

export interface AssignRoleRequest {
  userId: number;
  roleId: number;
  companyId: number;
}

// Response for POST /api/companies/{id}/users
export interface InviteUserResponse {
  statusCode: number;
  status: string;
  message: string;
  data: CompanyUser;
}
