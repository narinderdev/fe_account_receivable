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
  id?: number;
  paymentId?: number;
  customerId?: number;
  customerName?: string;
  createdAt?: string;
  bankDeposit?: number;
  serviceFee?: number;
  paymentAmount?: number;
  paymentMethod?: string;
  paymentDate?: string;
  notes?: string;
  source?: string;
  status?: string;
  customer?: CustomerEntity;
  applications?: PaymentApplication[];
  bankTransaction?: BankTransaction | null;
}

export interface ApproveApplyRequest {
  invoiceIds: number[];
}

export interface BankApproveApplyRequest {
  customerId: number;
  invoiceIds: number[];
}

export interface ApproveBankPaymentRequest {
  customerId: number;
}

export interface ApplyApprovedPaymentRequest {
  invoiceIds: number[];
}

// Complete API response shape
export interface PaymentPage {
  statusCode: number;
  status: string;
  message: string;
  data: PaginatedResponse<Payment>;
}

export interface ApplyPaymentRequest {
  bankDeposit: number;  
  serviceFee: number;   
  paymentAmount: number;
  paymentMethod: string;
  notes: string;
  
}

export interface ApplyPaymentResponse {
  statusCode: number;
  status: string;
  message: string;
  data?: Payment;
}

export interface BankTransaction {
  id: number;
  baiCode: string;
  transactionType: string;
  debitCredit: string;
  amount: number;
  customerName: string;
  reference: string;
  description: string;
  transactionDate: string;
  status: string;
  systemNote: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransactionsResponse {
  statusCode: number;
  status: string;
  message: string;
  data: BankTransaction[];
}
