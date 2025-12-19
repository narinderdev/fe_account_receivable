import { CustomerEntity, PaginatedResponse } from './customer.model';

export interface InvoiceItem {
  id: number;
  itemName: string;
  description: string | null;
  quantity: number;
  rate: number;
  amount: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  description: string | null;
  balanceDue: number;
  status: 'OPEN' | 'PAID';
  lastPaymentDate: string | null;
  note: string | null;
  generated: boolean;
  active: boolean;
  deleted: boolean;

  customer: CustomerEntity;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

export interface InvoicePage {
  statusCode: number;
  status: string;
  message: string;
  data: PaginatedResponse<Invoice>;
}

export interface CustomerInvoiceListResponse {
  statusCode: number;
  status: string;
  message: string;
  data: InvoiceWithItems[];
}

export interface InvoiceDetailResponse {
  statusCode: number;
  status: string;
  message: string;
  data: InvoiceWithItems;
}
