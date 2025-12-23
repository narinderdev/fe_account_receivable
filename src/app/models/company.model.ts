import { PaginatedResponse } from './customer.model';

export interface FinancialSettings {
  id: number;
  fiscalYearStartMonth: number;
  defaultArAccountCode: string;
  revenueRecognitionMode: string;
  defaultTaxHandling: string;
  defaultPaymentTerms: string;
  allowOtherTerms: boolean;
  enableCreditLimitChecking: boolean;
  agingBucketConfig: string;
  dunningFrequencyDays: number;
  enableAutomatedDunningEmails: boolean;
  defaultCreditLimit: number;
}

export interface PaymentSettings {
  id: number;
  acceptCheck: boolean;
  acceptCreditCard: boolean;
  acceptBankTransfer: boolean;
  acceptCash: boolean;
  remittanceInstructions: string;
}

export interface CompanyAddress {
  id: number;
  addressLine1: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string | null;
  addressCountry: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  website: string | null;
  primaryContactCountry: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: number;
  bankName: string;
  accountNumber: string;
  ifscSwift: string | null;
  currency: string | null;
  isDefault: boolean | null;
}

export interface UserRole {
  id: number;
  name: string;
  description: string;
}

export interface CompanyUser {
  id: number;
  name: string;
  email: string;
  status: string;
  role: UserRole;
}

export interface CompanyEntity {
  id: number;
  legalName: string;
  tradeName: string;
  companyCode: string;
  baseCurrency: string;
  timeZone: string;
  country: string;

  createdAt: string;
  updatedAt: string;

  financialSettings: FinancialSettings;
  paymentSettings: PaymentSettings;
  companyAddress: CompanyAddress;
  bankAccounts: BankAccount[];
  users: CompanyUser[];
  companyCustomers: { id: number }[];

  // Flattened fields used while editing
  addressLine1?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  addressCountry?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  website?: string | null;
  primaryContactCountry?: string | null;
  financial?: Partial<FinancialSettings> | null;
  payment?: Partial<PaymentSettings> | null;
}

export interface CompanyPageResponse {
  statusCode: number;
  status: string;
  message: string;
  data: PaginatedResponse<CompanyEntity>;
}

export interface CompanyResponse {
  statusCode: number;
  status: string;
  message: string;
  data: CompanyEntity;
}

export interface BaseResponse<T = unknown> {
  statusCode: number;
  status: string;
  message: string;
  data: T;
}

export type CreateCompanyPayload = Pick<
  CompanyEntity,
  'legalName' | 'tradeName' | 'companyCode' | 'country' | 'baseCurrency' | 'timeZone'
>;

export type CompanyAddressInput = Omit<CompanyAddress, 'id' | 'createdAt' | 'updatedAt'>;

export type FinancialSettingsInput = Omit<FinancialSettings, 'id'>;

export type PaymentSettingsInput = Omit<PaymentSettings, 'id'>;

export type BankAccountInput = Pick<BankAccount, 'bankName' | 'accountNumber'> &
  Partial<Omit<BankAccount, 'id' | 'bankName' | 'accountNumber'>>;

export interface CreateBankingPayload {
  paymentSettings: PaymentSettingsInput;
  bankAccounts: BankAccountInput[];
}
