import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthHeadersWithNgrok } from './auth-headers.util';
import { LoginReportResponse } from '../models/login-report.model';

@Injectable({
  providedIn: 'root',
})
export class LoginReportService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getLoginReport(companyId: number): Observable<LoginReportResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<LoginReportResponse>(`${this.baseUrl}/report/company/${companyId}`, {
      headers,
    });
  }
}
