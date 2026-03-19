export interface PeriodManagementResponse {
  statusCode: number;
  status: string;
  message: string;
  data: PeriodManagementPayload | null;
}

export interface PeriodManagementPayload {
  financialYear?: number | null;
  monthEndStatuses?: PeriodMonthStatus[];
  yearEndStatuses?: PeriodYearStatus[];
}

export interface PeriodMonthStatus {
  month?: string | null;
  monthName?: string | null;
  label?: string | null;
  year?: number | string | null;
  status?: string | null;
  snapshotBalance?: number | string | null;
  amount?: number | string | null;
}

export interface PeriodYearStatus {
  year?: number | string | null;
  status?: string | null;
  yearEndAr?: number | string | null;
  estimatedClosingAr?: number | string | null;
}
