export interface GlTransactionLine {
  glCodeDescription: string | null;
  entryType: string;
  amount: number;
}

export interface GlTransaction {
  id: number;
  companyId: number;
  companyName: string;
  referenceType: string;
  referenceId: number;
  referenceNumber: string;
  transactionDate: string;
  amount: number;
  status: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  lines?: GlTransactionLine[] | null;
}

export interface PageMetadata<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty?: boolean;
  numberOfElements?: number;
  pageable?: Record<string, unknown>;
  sort?: Record<string, unknown>;
}

export interface GlTransactionPage {
  statusCode: number;
  status: string;
  message: string;
  data: PageMetadata<GlTransaction>;
}
