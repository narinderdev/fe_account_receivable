import { CustomerEntity } from './customer.model';
import { PaginatedResponse } from './customer.model';

// Invoice INSIDE Payment → Notice fewer fields than full Invoice model
export interface PaymentInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;

  subTotal: number;
  totalAmount: number;
  balanceDue: number;

  status: 'PAID' | 'OPEN' | 'PARTIAL';
  lastPaymentDate: string | null;
  note: string | null;

  generated: boolean;
  active: boolean;
  deleted: boolean;

  customer: CustomerEntity;
}

// Application inside a payment
export interface PaymentApplication {
  id: number;
  invoice: PaymentInvoice;
  appliedAmount: number;
  openAmount?: number;
}

// Main Payment interface
export interface Payment {
  id: number;
  paymentAmount: number;
  paymentMethod: string;
  paymentDate: string;
  notes: string;

  customer: CustomerEntity;
  applications: PaymentApplication[];
}

// Complete API response shape
export interface PaymentPage {
  statusCode: number;
  status: string;
  message: string;
  data: PaginatedResponse<Payment>;
}

export interface ApplyPaymentRequest {
  paymentAmount: number;
  paymentMethod: string;
  notes: string;
  invoiceIds: number[];
}

export interface ApplyPaymentResponse {
  statusCode: number;
  status: string;
  message: string;
  data?: Payment;
}
