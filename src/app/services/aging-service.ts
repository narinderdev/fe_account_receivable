import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaymentPage } from '../models/payment.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AgingService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  private headers = new HttpHeaders({
    'ngrok-skip-browser-warning': 'true',
  });

  getAging(companyId: number, filters?: {
    customerId?: number;
    status?: string;
    asOfDate?: string;
  }): Observable<PaymentPage> {
    let params = new HttpParams();

    if (filters) {
      if (filters.customerId) {
        params = params.set('customerId', filters.customerId);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.asOfDate) {
        params = params.set('asOfDate', filters.asOfDate);
      }
    }

    return this.http.get<PaymentPage>(`${this.baseUrl}/reports/aging/company/${companyId}`, {
      headers: this.headers,
      params,
    });
  }
}
