import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { ApplyPaymentRequest, ApplyPaymentResponse, PaymentPage } from '../models/payment.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  // ✅ Helper method to get authorization headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ✅ Helper method to get headers with both auth and ngrok skip (for GET requests)
  private getAuthHeadersWithNgrok(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true'
    });
  }

  getPayments(companyId: number, page = 0, size = 10): Observable<PaymentPage> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<PaymentPage>(
      `${this.baseUrl}/payment/company/${companyId}?page=${page}&size=${size}`,
      { headers }
    );
  }

  applyPayment(customerId: number, data: ApplyPaymentRequest): Observable<ApplyPaymentResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<ApplyPaymentResponse>(
      `${this.baseUrl}/payment/apply/${customerId}`,
      data,
      { headers }
    );
  }
}