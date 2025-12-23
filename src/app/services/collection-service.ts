import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PromiseToPayResponse } from '../models/promise-to-pay.model';
import {
  PendingAmountResponse,
  PendingCustomerResponse,
  CreatePromiseToPayRequest,
  DisputeCodeResponse,
  CreateDisputeRequest,
  DisputeResponse,
  DisputeDetailResponse,
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

  getDisputeCode(): Observable<DisputeCodeResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get<DisputeCodeResponse>(`${this.baseUrl}/api/disputes/codes`, {
      headers,
    });
  }

  getDisputes(companyId: number): Observable<DisputeResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get<DisputeResponse>(`${this.baseUrl}/api/disputes/company/${companyId}`, {
      headers,
    });
  }

  createDispute(data: CreateDisputeRequest): Observable<PromiseToPayResponse> {
    return this.http.post<PromiseToPayResponse>(`${this.baseUrl}/api/disputes`, data);
  }

  getDisputeById(disputeId: number): Observable<DisputeDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get<DisputeDetailResponse>(`${this.baseUrl}/api/disputes/${disputeId}`, {
      headers,
    });
  }

  createPromiseToPay(data: CreatePromiseToPayRequest): Observable<PromiseToPayResponse> {
    return this.http.post<PromiseToPayResponse>(`${this.baseUrl}/collections/promise`, data);
  }

  getPromiseToPay(companyId: number): Observable<PromiseToPayResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get<PromiseToPayResponse>(
      `${this.baseUrl}/collections/promise/company/${companyId}`,
      { headers }
    );
  }

  getPendingCustomer(companyId: number): Observable<PendingCustomerResponse> {
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
