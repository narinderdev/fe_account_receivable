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

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private getAuthHeadersWithNgrok(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true'
    });
  }

  getOverdueBalance(customerId: number): Observable<PendingAmountResponse> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<PendingAmountResponse>(
      `${this.baseUrl}/invoice/${customerId}/pending-amount-customer`,
      {
        headers,
      }
    );
  }

  getCompanyOverdue(companyId: number): Observable<PendingAmountResponse> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<PendingAmountResponse>(
      `${this.baseUrl}/invoice/${companyId}/pending-amount-company`,
      {
        headers,
      }
    );
  }

  // ✅ GET request
  getDisputeCode(): Observable<DisputeCodeResponse> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<DisputeCodeResponse>(`${this.baseUrl}/api/disputes/codes`, {
      headers,
    });
  }

  // ✅ GET request
  getDisputes(companyId: number): Observable<DisputeResponse> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<DisputeResponse>(`${this.baseUrl}/api/disputes/company/${companyId}`, {
      headers,
    });
  }

  // ✅ POST request
  createDispute(data: CreateDisputeRequest): Observable<PromiseToPayResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<PromiseToPayResponse>(`${this.baseUrl}/api/disputes`, data, { headers });
  }

  // ✅ GET request
  getDisputeById(disputeId: number): Observable<DisputeDetailResponse> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<DisputeDetailResponse>(`${this.baseUrl}/api/disputes/${disputeId}`, {
      headers,
    });
  }

  // ✅ POST request
  createPromiseToPay(data: CreatePromiseToPayRequest): Observable<PromiseToPayResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<PromiseToPayResponse>(`${this.baseUrl}/collections/promise`, data, { headers });
  }

  // ✅ GET request
  getPromiseToPay(companyId: number): Observable<PromiseToPayResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<PromiseToPayResponse>(
      `${this.baseUrl}/collections/promise/company/${companyId}`,
      { headers }
    );
  }

  getPendingCustomer(companyId: number): Observable<PendingCustomerResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<PendingCustomerResponse>(
      `${this.baseUrl}/invoice/company/${companyId}/with-pending-amounts`,
      { headers }
    );
  }

  getCustomerPromise(customerId: number): Observable<PromiseToPayResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<PromiseToPayResponse>(
      `${this.baseUrl}/collections/promise/customer/${customerId}`,
      { headers }
    );
  }
}