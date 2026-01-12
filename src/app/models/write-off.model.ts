import { PaginatedResponse } from './customer.model';

export interface WriteOffEntity {
  id: number;
  customerId: number;
  customerName: string;
  invoiceId: number;
  invoiceNumber: string;
  reason: string;
  writeOffDate: string | null;
}

export interface CreateWriteOffPayload {
  reason: string;
  arCodeId: number;
}

export interface WriteOffApiResponse<T> {
  statusCode: number;
  status: string;
  message: string;
  data: T;
}

export type WriteOffPageResponse = WriteOffApiResponse<PaginatedResponse<WriteOffEntity>>;
