import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthHeadersWithNgrok } from './auth-headers.util';
import { MfaReportResponse } from '../models/mfa-report.model';

@Injectable({
  providedIn: 'root',
})
export class MfaReportService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getReport(companyId: number): Observable<MfaReportResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<MfaReportResponse>(`${this.baseUrl}/report/mfa/company/${companyId}`, {
      headers,
    });
  }
}
