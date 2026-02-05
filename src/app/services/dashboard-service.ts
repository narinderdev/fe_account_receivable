import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardSummaryResponse, DashboardGraphResponse, DashboardInvoiceResponse } from '../models/dashboard.model';
import { getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getDashboardCardData(companyId: number): Observable<DashboardSummaryResponse> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<DashboardSummaryResponse>(
      `${this.baseUrl}/dashboard/summary/company/${companyId}`,
      { headers }
    );
  }

  getDashboardGraphData(companyId: number): Observable<DashboardGraphResponse> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<DashboardGraphResponse>(
      `${this.baseUrl}/ar/company/${companyId}/balance-series`,
      { headers }
    );
  }

  getDashboardInvoiceData(companyId: number, year: number): Observable<DashboardInvoiceResponse> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<DashboardInvoiceResponse>(
      `${this.baseUrl}/dashboard/invoices/monthly/company/${companyId}?year=${year}`, 
      { headers }
    );
  }
}
