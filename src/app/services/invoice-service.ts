import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import {
  CreateInvoiceRequest,
  CustomerInvoiceListResponse,
  InvoiceDetailResponse,
  InvoiceListResponse,
  InvoicePage,
  SendInvoiceResponse,
} from '../models/invoice.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
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

  getInvoices(
    companyId: number,
    params: {
      months?: number; // For preset periods (1, 2, 6, 12)
      fromDate?: string; // For custom date range
      toDate?: string; // For custom date range
      page?: number;
      size?: number;
    },
  ): Observable<InvoicePage> {
    const headers = this.getAuthHeadersWithNgrok();

    let queryParams: string[] = [];

    // Add months parameter if present (for preset periods)
    if (params.months !== undefined) {
      queryParams.push(`months=${params.months}`);
    }

    // Add custom date range if present
    if (params.fromDate) {
      queryParams.push(`dateFrom=${params.fromDate}`);
    }
    if (params.toDate) {
      queryParams.push(`dateTo=${params.toDate}`);
    }

    // Add pagination
    queryParams.push(`page=${params.page ?? 0}`);
    queryParams.push(`size=${params.size ?? 10}`);

    return this.http.get<InvoicePage>(
      `${this.baseUrl}/invoice/unpaid/company/${companyId}?${queryParams.join('&')}`,
      { headers },
    );
  }

  getDraftedInvoice(companyId: number): Observable<any> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<any>(`${this.baseUrl}/invoice/company/${companyId}/drafts`, {
      headers,
    });
  }

  approveInvoice(invoiceId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.baseUrl}/invoice/approve/${invoiceId}`, null, {
      headers,
    });
  }

  createInvoice(customerId: number, data: CreateInvoiceRequest): Observable<InvoiceDetailResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<InvoiceDetailResponse>(`${this.baseUrl}/invoice/${customerId}`, data, {
      headers,
    });
  }

  sendInvoice(invoiceId: number, companyId: number): Observable<SendInvoiceResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<SendInvoiceResponse>(
      `${this.baseUrl}/invoice/send/${companyId}/${invoiceId}`,
      null,
      {
        headers,
      },
    );
  }

  getUnpaidInvoices(customerId: number): Observable<InvoiceListResponse> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<InvoiceListResponse>(`${this.baseUrl}/invoice/unpaid/${customerId}`, {
      headers,
    });
  }

  getCustomerInvoicesById(customerId: number): Observable<CustomerInvoiceListResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<CustomerInvoiceListResponse>(
      `${this.baseUrl}/invoice/customer/${customerId}`,
      {
        headers,
      },
    );
  }

  getFilteredInvoices(
    companyId: number,
    params: {
      statuses?: string[];
      months?: number; // For preset periods
      fromDate?: string; // For custom range
      toDate?: string; // For custom range
      page?: number;
      size?: number;
    },
  ): Observable<InvoicePage> {
    const headers = this.getAuthHeadersWithNgrok();

    let queryParams: string[] = [];

    if (params.statuses?.length) {
      queryParams.push(`statuses=${params.statuses.join(',')}`);
    }

    // Add months parameter if present
    if (params.months !== undefined) {
      queryParams.push(`months=${params.months}`);
    }

    // Add custom date range if present
    if (params.fromDate) {
      queryParams.push(`fromDate=${params.fromDate}`);
    }
    if (params.toDate) {
      queryParams.push(`toDate=${params.toDate}`);
    }

    queryParams.push(`page=${params.page ?? 0}`);
    queryParams.push(`size=${params.size ?? 10}`);

    return this.http.get<InvoicePage>(
      `${this.baseUrl}/invoice/company/${companyId}?${queryParams.join('&')}`,
      { headers },
    );
  }

  getInvoiceTemplate(): Observable<any> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<any>(`${this.baseUrl}/invoice/import/template-metadata`, {
      headers,
    });
  }

  uploadInvoiceCsv(companyId: number, formData: FormData): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.baseUrl}/invoice/import/${companyId}`, formData, {
      headers,
    });
  }
}
