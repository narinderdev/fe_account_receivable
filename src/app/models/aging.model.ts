export interface AgingRowDto {
  customerId: number;
  customerName: string;
  totalDue: number;
  current: number;
  bucket1To30: number;
  bucket31To60: number;
  bucket61To90: number;
  bucketGt90: number;
}

export interface AgingDataPayload {
  asOfDate: string;
  rows: AgingRowDto[];
}

export interface AgingResponse {
  statusCode: number;
  status: string;
  message: string;
  data: AgingDataPayload;
}

export interface AgingFilters {
  customerId?: number;
  status?: string;
  asOfDate?: string;
}
