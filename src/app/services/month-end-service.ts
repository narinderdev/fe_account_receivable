import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MonthEndCompanyResponse, MonthEndCustomerResponse } from '../models/month-end.model';
import { PeriodManagementResponse } from '../models/accounting.model';
import { getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class MonthEndService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getCompanyMonthEnd(companyId: number, month: string): Observable<MonthEndCompanyResponse> {
    const headers = getAuthHeadersWithNgrok();
    const params = new HttpParams()
      .set('companyId', String(companyId))
      .set('month', month);

    return this.http.get<MonthEndCompanyResponse>(`${this.baseUrl}/ar/company/month-end`, {
      headers,
      params,
    });
  }

  getCustomerMonthEnd(customerId: number, month: string): Observable<MonthEndCustomerResponse> {
    const headers = getAuthHeadersWithNgrok();
    const params = new HttpParams()
      .set('customerId', String(customerId))
      .set('month', month);

    return this.http.get<MonthEndCustomerResponse>(`${this.baseUrl}/ar/customer/month-end`, {
      headers,
      params,
    });
  }

  getCompanyYearSummary(companyId: number, year: number): Observable<PeriodManagementResponse> {
    const headers = getAuthHeadersWithNgrok().set('Content-Type', 'application/json');
    const payload = { companyId, year };

    return this.http.post<PeriodManagementResponse>(
      `${this.baseUrl}/ar/company/year-full`,
      payload,
      { headers },
    );
  }
}
