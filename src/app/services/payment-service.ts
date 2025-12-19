import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { PaymentPage } from '../models/payment.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getPayments(page = 0, size = 10): Observable<PaymentPage> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get<PaymentPage>(
      `${this.baseUrl}/payment?page=${page}&size=${size}`,
      { headers }
    );
  }

  applyPayment(customerId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/payment/apply/${customerId}`, data);
  }

}
