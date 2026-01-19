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

export interface MonthBalance {
  month: string;
  balance: number;
}

export interface GraphData {
  companyId: number;
  series: MonthBalance[];
}

export interface DashboardGraphResponse {
  statusCode: number;
  status: string;
  message: string;
  data: GraphData;
}

// Invoice data models
export interface InvoiceMonthPoint {
  yearMonth: string;
  invoiceCount: number;
  totalAmount: number;
}

export interface InvoiceGraphData {
  companyId: number;
  points: InvoiceMonthPoint[];
}

export interface DashboardInvoiceResponse {
  statusCode: number;
  status: string;
  message: string;
  data: InvoiceGraphData;
}
