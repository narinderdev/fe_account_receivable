import { CustomerEntity } from './customer.model';
import { Invoice } from './invoice.model';

export interface PendingCustomerSummary {
  id: number;
  customerName: string;
  overdueAmount?: number;
}

export interface PendingCustomerResponse {
  statusCode: number;
  status: string;
  message: string;
  data: PendingCustomerSummary[];
}

export interface PendingAmountResponse {
  statusCode: number;
  status: string;
  message: string;
  data: number;
}

export interface CreatePromiseToPayRequest {
  customerId: number;
  amountPromised: number;
  promiseDate: string;
  notes: string;
}

export interface DisputeCode {
  code: string;
  label: string;
}

export interface DisputeCodeResponse {
  statusCode: number;
  status: string;
  message: string;
  data: DisputeCode[];
}

export interface CreateDisputeRequest {
  customerId: number;
  invoiceId: number;
  disputeCode: string;
  disputedAmount: number;
  reason: string;
  resolutionDate?: string;
}

export interface DisputeRecord {
  id: number;
  disputeId: string;
  companyId: number;
  customer: CustomerEntity;
  invoice: Invoice;
  invoiceOriginalAmount: number;
  disputedAmount: number;
  disputeCode: string;
  reason: string;
  status: string;
  resolutionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeResponse {
  statusCode: number;
  status: string;
  message: string;
  data: DisputeRecord[];
}

export interface DisputeDetailResponse {
  statusCode: number;
  status: string;
  message: string;
  data: DisputeRecord;
}
