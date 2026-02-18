import { CompanyEntity } from './company.model';
import { ApiResponse } from './customer.model';
import { CompanyUserRoleAssignment } from './company-users.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserCompanyLink {
  id: number;
  company: CompanyEntity & {
    hibernateLazyInitializer?: Record<string, unknown>;
  };
}

export interface AuthenticatedUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  deleted: boolean;
  userCompanies: UserCompanyLink[];
  userRoles: CompanyUserRoleAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginSuccessData {
  token: string;
  user: AuthenticatedUser;
}

export interface LoginResponse extends ApiResponse<LoginSuccessData> {}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export type SignupResponse = ApiResponse<{ id?: number } | null>;

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse extends ApiResponse<AuthenticatedUser> {}

export interface SetPasswordRequest {
  email: string;
  password: string;
}

export type SetPasswordResponse = ApiResponse<null>;

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export type ChangePasswordResponse = ApiResponse<null>;
