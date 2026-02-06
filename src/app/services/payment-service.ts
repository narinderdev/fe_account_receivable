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
} from '../models/payment.model';
import { environment } from '../../environments/environment';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getPayments(companyId: number, params: { months: number }): Observable<BankTransactionsResponse> {
    const headers = getAuthHeadersWithNgrok();
    const months = params.months ?? 1;

    return this.http.get<BankTransactionsResponse>(
      `${this.baseUrl}/api/bank-reconciliation/company/${companyId}/transactions?months=${months}`,
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

    return this.http.get<PaymentPage>(
      `${this.baseUrl}/payment/company/${companyId}/draft`,
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
    return this.http.post(
      `${this.baseUrl}/payment/${paymentId}/approve-apply`,
      payload,
      { headers },
    );
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
      params.statuses.forEach((s) => queryParams.push(`statuses=${encodeURIComponent(s)}`));
    }

    return this.http.get<PaymentPage>(
      `${this.baseUrl}/payment/company/${companyId}/filter?${queryParams.join('&')}`,
      { headers },
    );
  }
}
