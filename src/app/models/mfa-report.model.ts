export interface MfaReportEntry {
  userName: string;
  email: string;
  roleName: string;
  mfaStatus: string;
  mfaEnabledAt: string | null;
}

export interface MfaReportResponse {
  statusCode: number;
  status: string;
  message: string;
  data: MfaReportEntry[];
}
