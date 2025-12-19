export type PromiseStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface PromiseToPayRecord {
  id: number;
  customerName: string;
  invoiceNumber?: string | null;
  amountPromised: number;
  promiseDate: string;
  status: PromiseStatus;
  notes: string;
}

export interface PromiseToPayResponse {
  statusCode: number;
  status: string;
  message: string;
  data: PromiseToPayRecord[];
}
