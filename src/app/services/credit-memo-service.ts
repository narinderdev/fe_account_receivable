import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  CreateCreditMemoPayload,
  CreateCreditMemoResponse,
  CreditMemoBalanceResponse,
  CreditMemoPageResponse,
  UpdateCreditMemoPayload,
} from '../models/credit-memo.model';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class CreditMemoService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  createMemo(
    data: CreateCreditMemoPayload,
    customerId: number
  ): Observable<CreateCreditMemoResponse> {
    const headers = getAuthHeaders();
    return this.http.post<CreateCreditMemoResponse>(
      `${this.baseUrl}/credit-memos/customer/${customerId}`,
      data,
      {
        headers,
      }
    );
  }

  getCompanyCreditMemos(
    companyId: number,
    status?: 'CREATED' | 'APPROVED',
    page = 0,
    size = 10
  ): Observable<CreditMemoPageResponse> {
    const headers = getAuthHeadersWithNgrok();
    const statusQuery = status ? `&status=${status}` : '';
    return this.http.get<CreditMemoPageResponse>(
      `${this.baseUrl}/credit-memos/company/${companyId}?page=${page}&size=${size}${statusQuery}`,
      {
        headers,
      }
    );
  }

  getCustomerCreditBalance(customerId: number): Observable<CreditMemoBalanceResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<CreditMemoBalanceResponse>(
      `${this.baseUrl}/credit-memos/customer/${customerId}`,
      {
        headers,
      }
    );
  }

  approveCreditMemo(creditMemoId: number): Observable<any> {
      const headers = getAuthHeaders();
      return this.http.post<any>(
        `${this.baseUrl}/credit-memos/${creditMemoId}/approve`,
        {},
        {
          headers,
        }
      );
    }

  updateMemo(creditMemoId: number, data: UpdateCreditMemoPayload): Observable<CreateCreditMemoResponse> {
    const headers = getAuthHeaders();
    return this.http.put<CreateCreditMemoResponse>(`${this.baseUrl}/credit-memos/${creditMemoId}`, data, {
      headers,
    });
  }
}
