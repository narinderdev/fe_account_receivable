import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApplyPaymentRequest,
  ApplyPaymentResponse,
  BankTransactionsResponse,
  PaymentPage,
  ApproveApplyRequest,
  BankApproveApplyRequest,
  ApproveBankPaymentRequest,
  ApplyApprovedPaymentRequest,
} from '../models/payment.model';
import { environment } from '../../environments/environment';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getPayments(
    companyId: number,
    params: { months?: number; fromDate?: string; toDate?: string },
  ): Observable<BankTransactionsResponse> {
    const headers = getAuthHeadersWithNgrok();
    const queryParams: string[] = [];

    if (params.fromDate) {
      queryParams.push(`fromDate=${encodeURIComponent(params.fromDate)}`);
    }
    if (params.toDate) {
      queryParams.push(`toDate=${encodeURIComponent(params.toDate)}`);
    }

    if (params.months !== undefined) {
      queryParams.push(`months=${params.months}`);
    }

    if (!queryParams.length) {
      queryParams.push('months=1');
    }

    const queryString = queryParams.join('&');

    return this.http.get<BankTransactionsResponse>(
      `${this.baseUrl}/api/bank-reconciliation/company/${companyId}/transactions?${queryString}`,
      { headers },
    );
  }

  uploadBaiFile(companyId: number, file: File): Observable<any> {
    const headers = getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(
      `${this.baseUrl}/api/bank-reconciliation/company/${companyId}/upload`,
      formData,
      { headers },
    );
  }

  uploadEobFile(companyId: number, file: File): Observable<any> {
    const headers = getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(
      `${this.baseUrl}/api/era/company/${companyId}/upload`,
      formData,
      { headers },
    );
  }

  getManualPayments(
    companyId: number,
    _params?: {
      statuses?: string[];
      months?: number;
      fromDate?: string;
      toDate?: string;
      page?: number;
      size?: number;
    },
  ): Observable<PaymentPage> {
    const headers = getAuthHeadersWithNgrok();
    const queryParams: string[] = [];

    if (_params) {
      // Add pagination params
      if (_params.page !== undefined) {
        queryParams.push(`page=${_params.page}`);
      }

      if (_params.size !== undefined) {
        queryParams.push(`size=${_params.size}`);
      }

      // Add date filters
      if (_params.fromDate) {
        queryParams.push(`fromDate=${encodeURIComponent(_params.fromDate)}`);
      }

      if (_params.toDate) {
        queryParams.push(`toDate=${encodeURIComponent(_params.toDate)}`);
      }

      // Add months filter
      if (_params.months !== undefined) {
        queryParams.push(`months=${_params.months}`);
      }

      // Add statuses array
      if (_params.statuses?.length) {
        _params.statuses.forEach((status) => {
          queryParams.push(`statuses=${encodeURIComponent(status)}`);
        });
      }
    }

    const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';

    return this.http.get<PaymentPage>(
      `${this.baseUrl}/payment/company/${companyId}/created${queryString}`,
      { headers },
    );
  }

  applyPayment(customerId: number, data: ApplyPaymentRequest): Observable<ApplyPaymentResponse> {
    const headers = getAuthHeaders();
    return this.http.post<ApplyPaymentResponse>(
      `${this.baseUrl}/payment/manual/create/${customerId}`,
      data,
      { headers },
    );
  }

  approveAndApply(paymentId: number, payload: ApproveApplyRequest): Observable<any> {
    const headers = getAuthHeaders();
    return this.http.post(`${this.baseUrl}/payment/${paymentId}/approve-apply`, payload, {
      headers,
    });
  }

  approvePayment(paymentId: number): Observable<any> {
    const headers = getAuthHeaders();
    return this.http.post(`${this.baseUrl}/payment/${paymentId}/approve`, null, { headers });
  }

  approveAndApplyBankTransaction(
    bankTransactionId: number,
    payload: BankApproveApplyRequest,
  ): Observable<any> {
    const headers = getAuthHeaders();
    return this.http.post(
      `${this.baseUrl}/api/bank-reconciliation/transaction/${bankTransactionId}/approve-apply`,
      payload,
      { headers },
    );
  }

  approveBankTransaction(
    bankTransactionId: number,
    payload: ApproveBankPaymentRequest,
  ): Observable<any> {
    const headers = getAuthHeaders();

    return this.http.post(
      `${this.baseUrl}/api/bank-reconciliation/transaction/${bankTransactionId}/approve`,
      payload,
      { headers },
    );
  }

  applyApprovedPayment(
    paymentId: number,
    payload: ApplyApprovedPaymentRequest,
  ): Observable<ApplyPaymentResponse> {
    const headers = getAuthHeaders();
    return this.http.post<ApplyPaymentResponse>(
      `${this.baseUrl}/payment/${paymentId}/apply`,
      payload,
      { headers },
    );
  }

  getFilteredPayments(
    companyId: number,
    params: {
      statuses?: string[];
      months?: number;
      fromDate?: string;
      toDate?: string;
      page?: number;
      size?: number;
    },
  ): Observable<PaymentPage> {
    const headers = getAuthHeadersWithNgrok();

    const queryParams: string[] = [];

    // 1) pagination first
    queryParams.push(`page=${params.page ?? 0}`);
    queryParams.push(`size=${params.size ?? 10}`);

    if (params.fromDate) queryParams.push(`fromDate=${encodeURIComponent(params.fromDate)}`);
    if (params.toDate) queryParams.push(`toDate=${encodeURIComponent(params.toDate)}`);

    if (params.months !== undefined) queryParams.push(`months=${params.months}`);

    if (params.statuses?.length) {
      params.statuses.forEach((s) => queryParams.push(`status=${encodeURIComponent(s)}`));
    }

    return this.http.get<PaymentPage>(
      `${this.baseUrl}/payment/company/${companyId}/filter?${queryParams.join('&')}`,
      { headers },
    );
  }
}
