import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

export interface PaymentTermPayload {
  name: string;
  netDays: number;
  active?: boolean;
}

export interface PaymentTermDto {
  id?: number;
  name?: string;
  netDays?: number;
  active?: boolean;
  description?: string;
  createdAt?: string;
}

export interface PaymentTermResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: PaymentTermDto;
}

export interface PaymentTermListResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: PaymentTermDto[];
}

@Injectable({ providedIn: 'root' })
export class PaymentTermsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  createPaymentTerm(companyId: number, payload: PaymentTermPayload): Observable<PaymentTermResponse> {
    const headers = getAuthHeaders();
    return this.http.post<PaymentTermResponse>(`${this.baseUrl}/companies/${companyId}/payment-terms`, payload, {
      headers,
    });
  }

  getPaymentTerms(companyId: number): Observable<PaymentTermListResponse> {
    const headers = getAuthHeadersWithNgrok(true);
    return this.http.get<PaymentTermListResponse>(
      `${this.baseUrl}/companies/${companyId}/payment-terms`,
      { headers },
    );
  }

  updatePaymentTerm(companyId: number, id: number, payload: PaymentTermPayload): Observable<PaymentTermResponse> {
    const headers = getAuthHeaders();
    return this.http.put<PaymentTermResponse>(
      `${this.baseUrl}/companies/${companyId}/payment-terms/${id}`,
      payload,
      { headers },
    );
  }

  deletePaymentTerm(companyId: number, id: number): Observable<void> {
    const headers = getAuthHeaders();
    return this.http.delete<void>(`${this.baseUrl}/companies/${companyId}/payment-terms/${id}`, {
      headers,
    });
  }
}
