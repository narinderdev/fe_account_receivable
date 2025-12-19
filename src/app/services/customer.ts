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

  private getStoredUserId(): number | null {
    const raw = localStorage.getItem('signupUserId');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }

  getCustomers(page = 0, size = 10): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get(`${this.baseUrl}/customer?page=${page}&size=${size}`, { headers });
  }

  createCustomer(companyId: number, data: any, userId?: number): Observable<any> {
    const resolvedUserId = userId ?? this.getStoredUserId();
    return this.http.post(`${this.baseUrl}/customer/${resolvedUserId}/${companyId}`, data);
  }

  saveAddress(customerId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/customer/${customerId}/address`, data);
  }

  saveApplication(customerId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/customer/${customerId}/cash-application`, data);
  }

  saveStatement(customerId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/customer/${customerId}/statement`, data);
  }

  saveEft(customerId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/customer/${customerId}/eft`, data);
  }

  saveVat(customerId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/customer/${customerId}/vat`, data);
  }

  saveCredit(customerId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/customer/${customerId}/dunning-credit`, data);
  }

  getCustomerById(id: number): Observable<CustomerDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get<CustomerDetailResponse>(`${this.baseUrl}/customer/${id}`, { headers });
  }

  updateCustomer(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/customer/${id}`, data);
  }

  deleteCustomer(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/customer/${id}`);
  }

  getCustomerInvoicesById(id: number): Observable<CustomerInvoiceListResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get<CustomerInvoiceListResponse>(`${this.baseUrl}/invoice/customer/${id}`, {
      headers,
    });
  }

  getInvoiceDetail(id: number): Observable<InvoiceDetailResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get<InvoiceDetailResponse>(`${this.baseUrl}/invoice/${id}`, { headers });
  }

  uploadCsv(companyId: number, data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/customer/import-csv?companyId=${companyId}`, data);
  }
}
