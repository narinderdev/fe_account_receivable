export interface LoginReportEntry {
  userId: number;
  email: string;
  loginAt: string;
  ipAddress: string | null;
  status: string;
}

export interface LoginReportResponse {
  statusCode: number;
  status: string;
  message: string;
  data: LoginReportEntry[];
}
