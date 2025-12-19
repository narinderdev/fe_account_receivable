export interface Address {
  id: number;
  addressLine1: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  stateProvince: string | null;
}

export interface CashApplication {
  id: number;
  applyPayments: boolean;
  autoApplyPayments: boolean;
  shipCreditCheck: boolean;
  toleranceAmount: number | null;
  tolerancePercentage: number | null;
}

export interface Dunning {
  id: number;
  creditLimit: number;
  dunningLevel: string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  pastDue: string;
  placeOnCreditHold: boolean;
}

export interface EFT {
  id: number;
  bankName: string;
  bankIdentifierCode: string;
  ibanAccountNumber: string;
  enableAchPayments: boolean;
}

export interface VAT {
  id: number;
  taxAgencyName: string;
  taxIdentificationNumber: string;
  enableVatCodes: boolean;
}

export interface Statement {
  id: number;
  sendStatements: boolean;
  autoApplyPayments: boolean;
  tolerancePercentage: number | null;
  minimumAmount: number | null;
}

export interface CustomerEntity {
  id: number;
  customerId: number;
  customerName: string;
  customerType: string;
  email: string;
  deleted: boolean;

  address: Address | null;
  cashApplication: CashApplication | null;
  dunning: Dunning | null;
  eft: EFT | null;
  statement: Statement | null;
  vat: VAT | null;
}

export interface PaginatedResponse<T> {
  rows: never[];
  content: T[];
  totalPages: number;
  number: number;
  size: number;
  totalElements: number;
  first: boolean;
  last: boolean;
}

export interface CustomerDetail extends CustomerEntity {
  companyId: number;
  companyName: string;
  createdAt: string;
  updatedAt: string;
  processing?: Record<string, unknown> | null;
}

export interface CustomerDetailResponse {
  statusCode: number;
  status: string;
  message: string;
  data: CustomerDetail;
}
