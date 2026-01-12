import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  CreateCreditMemoPayload,
  CreateCreditMemoResponse,
  CreditMemoBalanceResponse,
  CreditMemoPageResponse,
} from '../models/credit-memo.model';

@Injectable({
  providedIn: 'root',
})
export class CreditMemoService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  private getAuthHeadersWithNgrok(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      // 'ngrok-skip-browser-warning': 'true',
    });
  }

  createMemo(
    data: CreateCreditMemoPayload,
    customerId: number
  ): Observable<CreateCreditMemoResponse> {
    const headers = this.getAuthHeaders();
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
    page = 0,
    size = 10
  ): Observable<CreditMemoPageResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<CreditMemoPageResponse>(
      `${this.baseUrl}/credit-memos/company/${companyId}?page=${page}&size=${size}`,
      {
        headers,
      }
    );
  }

  getCustomerCreditBalance(customerId: number): Observable<CreditMemoBalanceResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<CreditMemoBalanceResponse>(
      `${this.baseUrl}/credit-memos/customer/${customerId}`,
      {
        headers,
      }
    );
  }
}
