import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaymentReportService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  private getAuthHeadersWithNgrok(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      // 'ngrok-skip-browser-warning': 'true',
    });
  }

  getPaymentMethodReport(companyId: number, months: number = 6): Observable<any> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<any>(
      `${this.baseUrl}/payment/report/company/${companyId}?months=${months}`,
      {
        headers,
      }
    );
  }

  getMonthlyPaymentReport(companyId: number, year: number): Observable<any> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<any>(
      `${this.baseUrl}/payment/monthly/company/${companyId}?year=${year}`,
      {
        headers,
      }
    );
  }
}