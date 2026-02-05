import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  OverdueInvoicesResponse,
  ChangeDisputeStatusResponse,
  SendReminderResponse,
} from '../models/collection.model';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class CollectionService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getOverdueBalance(customerId: number): Observable<PendingAmountResponse> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<PendingAmountResponse>(
      `${this.baseUrl}/invoice/${customerId}/pending-amount-customer`,
      {
        headers,
      }
    );
  }

  getCompanyOverdue(companyId: number): Observable<PendingAmountResponse> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<PendingAmountResponse>(
      `${this.baseUrl}/invoice/${companyId}/pending-amount-company`,
      {
        headers,
      }
    );
  }

  getDisputeCode(): Observable<DisputeCodeResponse> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<DisputeCodeResponse>(`${this.baseUrl}/api/disputes/codes`, {
      headers,
    });
  }

  getDisputes(companyId: number): Observable<DisputeResponse> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<DisputeResponse>(`${this.baseUrl}/api/disputes/company/${companyId}`, {
      headers,
    });
  }

  createDispute(data: CreateDisputeRequest): Observable<PromiseToPayResponse> {
    const headers = getAuthHeaders();
    return this.http.post<PromiseToPayResponse>(`${this.baseUrl}/api/disputes`, data, { headers });
  }

  getDisputeById(disputeId: number): Observable<DisputeDetailResponse> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<DisputeDetailResponse>(`${this.baseUrl}/api/disputes/${disputeId}`, {
      headers,
    });
  }

  changeDisputeStatus(
    data: { status: string },
    disputeId: number
  ): Observable<ChangeDisputeStatusResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.patch<ChangeDisputeStatusResponse>(
      `${this.baseUrl}/api/disputes/${disputeId}/status`,
      data,
      { headers }
    );
  }

  createPromiseToPay(data: CreatePromiseToPayRequest): Observable<PromiseToPayResponse> {
    const headers = getAuthHeaders();
    return this.http.post<PromiseToPayResponse>(`${this.baseUrl}/collections/promise`, data, {
      headers,
    });
  }

  getPromiseToPay(companyId: number): Observable<PromiseToPayResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<PromiseToPayResponse>(
      `${this.baseUrl}/collections/promise/company/${companyId}`,
      { headers }
    );
  }

  getOverdueBalanceList(companyId: number): Observable<PendingCustomerResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<PendingCustomerResponse>(
      `${this.baseUrl}/invoice/company/${companyId}/with-pending-amounts`,
      { headers }
    );
  }

  getCustomerPromise(customerId: number): Observable<PromiseToPayResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<PromiseToPayResponse>(
      `${this.baseUrl}/collections/promise/customer/${customerId}`,
      { headers }
    );
  }

  getOverdueInvoices(companyId: number): Observable<OverdueInvoicesResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<OverdueInvoicesResponse>(
      `${this.baseUrl}/invoice/company/${companyId}/overdue-invoices`,
      { headers }
    );
  }

  sendReminders(invoiceId: number, companyId: number): Observable<SendReminderResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.post<SendReminderResponse>(
      `${this.baseUrl}/api/reminders/invoice/${companyId}/${invoiceId}`,
      {},
      { headers }
    );
  }
}
