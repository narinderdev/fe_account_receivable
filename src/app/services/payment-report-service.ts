import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class PaymentReportService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getPaymentMethodReport(companyId: number, months: number = 6): Observable<any> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<any>(
      `${this.baseUrl}/payment/report/company/${companyId}?months=${months}`,
      {
        headers,
      }
    );
  }

  getMonthlyPaymentReport(companyId: number, year: number): Observable<any> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<any>(
      `${this.baseUrl}/payment/monthly/company/${companyId}?year=${year}`,
      {
        headers,
      }
    );
  }
}
