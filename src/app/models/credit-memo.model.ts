import { CustomerEntity, PaginatedResponse } from './customer.model';

export type CreditMemoStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'POSTED' | string;

export interface CreditMemoEntity {
  id: number;
  creditMemoNo?: string | null;
  creditReason?: string | null;
  amount: number;
  appliedAmount?: number;
  currency: string;
  arCodeId: number;
  arCode?: {
    id?: number;
    name?: string | null;
    code?: string | null;
  } | null;
  customer?: CustomerEntity | null;
  status?: CreditMemoStatus | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  postingDate?: string | null;
  targetInvoiceId?: number | null;
}

export interface CreateCreditMemoPayload {
  creditReason: string;
  amount: number;
  currency: string;
  arCodeId: number;
  invoiceId?: number;
}

export interface UpdateCreditMemoPayload {
  creditReason?: string;
  amount?: number;
  currency?: string;
  arCodeId?: number;
}

export interface ApplyCreditMemoPayload {
  applyAmount: number;
}

export interface CreditMemoApiResponse<T> {
  statusCode: number;
  status: string;
  message: string;
  data: T;
}

export type CreateCreditMemoResponse = CreditMemoApiResponse<CreditMemoEntity>;
export type CreditMemoListResponse = CreditMemoApiResponse<CreditMemoEntity[]>;
export type CreditMemoPageResponse = CreditMemoApiResponse<PaginatedResponse<CreditMemoEntity>>;

export interface CreditMemoCustomerBalance {
  customerId: number;
  customerName: string;
  totalPostedCredit: number;
  totalAppliedCredit: number;
  availableCredit: number;
  currency: string;
}

export type CreditMemoBalanceResponse = CreditMemoApiResponse<CreditMemoCustomerBalance>;
