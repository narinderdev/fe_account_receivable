export interface DashboardSummaryData {
  totalPaymentReceived: number;
  todayPaymentReceived: number;
  totalCustomers: number;
  totalReceivables: number;
  currentReceivables: number;
  totalInvoices: number;
  pendingInvoices: number;
  currentPromiseToPay: number;
}

export interface DashboardSummaryResponse {
  statusCode: number;
  status: string;
  message: string;
  data: DashboardSummaryData;
}
