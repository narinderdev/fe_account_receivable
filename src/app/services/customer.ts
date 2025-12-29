import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CustomerInvoiceListResponse, InvoiceDetailResponse } from '../models/invoice.model';
import { CustomerDetailResponse } from '../models/customer.model';

@Injectable({
  providedIn: 'root',
})
export class Customer {
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
      'ngrok-skip-browser-warning': 'true',
    });
  }

  private getStoredUserId(): number | null {
    const raw = localStorage.getItem('signupUserId');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }

  getCustomers(companyId: number, page = 0, size = 10): Observable<any> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get(
      `${this.baseUrl}/customer/company/${companyId}?page=${page}&size=${size}`,
      { headers }
    );
  }

  createCustomer(companyId: number, data: any, userId?: number): Observable<any> {
    const headers = this.getAuthHeaders();
    const resolvedUserId = userId ?? this.getStoredUserId();
    return this.http.post(`${this.baseUrl}/customer/${resolvedUserId}/${companyId}`, data, {
      headers,
    });
  }

  saveAddress(customerId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.baseUrl}/customer/${customerId}/address`, data, { headers });
  }

  saveApplication(customerId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.baseUrl}/customer/${customerId}/cash-application`, data, {
      headers,
    });
  }

  saveStatement(customerId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.baseUrl}/customer/${customerId}/statement`, data, { headers });
  }

  saveEft(customerId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.baseUrl}/customer/${customerId}/eft`, data, { headers });
  }

  saveVat(customerId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.baseUrl}/customer/${customerId}/vat`, data, { headers });
  }

  saveCredit(customerId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.baseUrl}/customer/${customerId}/dunning-credit`, data, {
      headers,
    });
  }

  getCustomerById(id: number): Observable<CustomerDetailResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<CustomerDetailResponse>(`${this.baseUrl}/customer/${id}`, { headers });
  }

  updateCustomer(id: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.baseUrl}/customer/${id}`, data, { headers });
  }

  deleteCustomer(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.baseUrl}/customer/${id}`, { headers });
  }

  getCustomerInvoicesById(id: number): Observable<CustomerInvoiceListResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<CustomerInvoiceListResponse>(`${this.baseUrl}/invoice/customer/${id}`, {
      headers,
    });
  }

  getInvoiceDetail(id: number): Observable<InvoiceDetailResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<InvoiceDetailResponse>(`${this.baseUrl}/invoice/${id}`, { headers });
  }

  uploadCsv(companyId: number, data: FormData): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.baseUrl}/customer/import-csv?companyId=${companyId}`, data, {
      headers,
    });
  }
}
