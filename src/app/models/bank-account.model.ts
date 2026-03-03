export type BankAccountStatus = 'ACTIVE' | 'INACTIVE';

export interface CompanyBankAccountEntity {
  bankAccountId: number;
  bankName: string;
  accountNumber: string;
  currency: string | null;
  isDefault: boolean | null;
  mappingStatus: string | null;
  ifscSwift?: string | null;
  address?: string | null;
  branch?: string | null;
}

export interface BankGlMappingEntity {
  bankAccountId: number;
  bankName: string;
  bankNumber: string;
  glCode: string | null;
  glCodeId: number | null;
  glDescription?: string | null;
  mappingId: number | null;
  status: BankAccountStatus;
}

export interface BankAccountApiResponse<T> {
  statusCode: number;
  status: string;
  message: string;
  data: T;
}

export type BankAccountListResponse = BankAccountApiResponse<CompanyBankAccountEntity[]>;
export type CreateBankAccountResponse = BankAccountApiResponse<CompanyBankAccountEntity>;
export type BankGlMappingResponse = BankAccountApiResponse<BankGlMappingEntity>;

export interface CreateBankAccountPayload {
  bankName: string;
  accountNumber: string;
  currency?: string | null;
  ifscSwift?: string | null;
  address?: string | null;
  branch?: string | null;
}

export interface BankGlMappingRequest {
  bankAccountId: number;
  glCodeId: number;
  status: BankAccountStatus;
}

export type UpdateBankGlMappingPayload = Partial<Omit<BankGlMappingRequest, 'bankAccountId'>>;
