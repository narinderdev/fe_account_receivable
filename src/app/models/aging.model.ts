export interface AgingRowDto {
  customerId: number;
  customerName: string;
  totalDue: number;
  current: number | null;
  bucket1To30?: number | null;
  bucket31To60?: number | null;
  bucket61To90?: number | null;
  bucketGt90?: number | null;
  buckets?: Record<string, number | null | undefined>;
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
