import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PromiseToPayResponse } from '../models/promise-to-pay.model';

@Injectable({
  providedIn: 'root',
})
export class CollectionService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getOverdueBalance(customerId: number): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get(`${this.baseUrl}/invoice/${customerId}/pending-amount-customer`, {
      headers,
    });
  }

  getCompanyOverdue(companyId: number): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get(`${this.baseUrl}/invoice/${companyId}/pending-amount-company`, {
      headers,
    });
  }

  createPromiseToPay(data: {
    customerId: number;
    amountPromised: number;
    promiseDate: string;
    notes: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/collections/promise`, data);
  }

  getPromiseToPay(): Observable<PromiseToPayResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get<PromiseToPayResponse>(`${this.baseUrl}/collections/promise`, { headers });
  }

  getPendingCustomer(companyId:number): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get<any>(
      `${this.baseUrl}/invoice/company/${companyId}/with-pending-amounts`,
      { headers }
    );
  }

  getCustomerPromise(customerId: number): Observable<PromiseToPayResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get<PromiseToPayResponse>(
      `${this.baseUrl}/collections/promise/customer/${customerId}`,
      { headers }
    );
  }
}
