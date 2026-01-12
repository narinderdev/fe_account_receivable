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
      'Authorization': `Bearer ${token}`
    });
  }

  private getAuthHeadersWithNgrok(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      // 'ngrok-skip-browser-warning': 'true'
    });
  }

  getInvoices(companyId: number, page = 0, size = 10): Observable<InvoicePage> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<InvoicePage>(
      `${this.baseUrl}/invoice/unpaid/company/${companyId}?page=${page}&size=${size}`,
      { headers }
    );
  }

  createInvoice(
    customerId: number,
    data: CreateInvoiceRequest
  ): Observable<InvoiceDetailResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<InvoiceDetailResponse>(`${this.baseUrl}/invoice/${customerId}`, data, {
      headers,
    });
  }

  sendInvoice(invoiceId: number): Observable<SendInvoiceResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<SendInvoiceResponse>(`${this.baseUrl}/invoice/send/${invoiceId}`, null, {
      headers,
    });
  }

  getUnpaidInvoices(customerId: number): Observable<InvoiceListResponse> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<InvoiceListResponse>(`${this.baseUrl}/invoice/unpaid/${customerId}`, {
      headers,
    });
  }

  getCustomerInvoicesById(customerId: number): Observable<CustomerInvoiceListResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<CustomerInvoiceListResponse>(`${this.baseUrl}/invoice/customer/${customerId}`, {
      headers,
    });
  }
}
