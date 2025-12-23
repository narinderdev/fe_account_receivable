import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PromiseToPayResponse } from '../models/promise-to-pay.model';
import {
  PendingAmountResponse,
  PendingCustomerResponse,
  CreatePromiseToPayRequest,
} from '../models/collection.model';

@Injectable({
  providedIn: 'root',
})
export class CollectionService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getOverdueBalance(customerId: number): Observable<PendingAmountResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get<PendingAmountResponse>(
      `${this.baseUrl}/invoice/${customerId}/pending-amount-customer`,
      {
        headers,
      }
    );
  }

  getCompanyOverdue(companyId: number): Observable<PendingAmountResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get<PendingAmountResponse>(
      `${this.baseUrl}/invoice/${companyId}/pending-amount-company`,
      {
        headers,
      }
    );
  }

  createPromiseToPay(data: CreatePromiseToPayRequest): Observable<PromiseToPayResponse> {
    return this.http.post<PromiseToPayResponse>(`${this.baseUrl}/collections/promise`, data);
  }

  getPromiseToPay(companyId:number): Observable<PromiseToPayResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get<PromiseToPayResponse>(`${this.baseUrl}/collections/promise/company/${companyId}`, { headers });
  }

  getPendingCustomer(companyId:number): Observable<PendingCustomerResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get<PendingCustomerResponse>(
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
