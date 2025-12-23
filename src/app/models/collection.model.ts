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
