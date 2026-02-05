import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class InvoiceReportService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getInvoiceAging(companyId: number): Observable<any> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<any>(`${this.baseUrl}/invoice/invoice-aging/company/${companyId}`, {
      headers,
    });
  }

  getInvoiceStatus(companyId: number, months: number = 6): Observable<any> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<any>(
      `${this.baseUrl}/invoice/status-breakdown/company/${companyId}?months=${months}`,
      {
        headers,
      }
    );
  }
}
