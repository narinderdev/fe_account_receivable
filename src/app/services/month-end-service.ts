import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AgingResponse, AgingFilters } from '../models/aging.model';

@Injectable({
  providedIn: 'root',
})
export class MonthEndService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  private getAuthHeadersWithNgrok(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true'
    });
  }

  getCompanyMonthEnd(companyId: number, month: string): Observable<any> {
    const headers = this.getAuthHeadersWithNgrok();
    const params = new HttpParams()
      .set('companyId', String(companyId))
      .set('month', month);

    return this.http.get<any>(`${this.baseUrl}/ar/company/month-end`, {
      headers,
      params,
    });
  }

  getCustomerMonthEnd(customerId: number, month: string): Observable<any> {
    const headers = this.getAuthHeadersWithNgrok();
    const params = new HttpParams()
      .set('customerId', String(customerId))
      .set('month', month);

    return this.http.get<any>(`${this.baseUrl}/ar/customer/month-end`, {
      headers,
      params,
    });
  }
}
