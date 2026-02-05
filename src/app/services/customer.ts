import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CustomerInvoiceListResponse, InvoiceDetailResponse } from '../models/invoice.model';
import {
  Address,
  AddressPayload,
  ApiResponse,
  CashApplication,
  CashApplicationPayload,
  CreateCustomerPayload,
  CustomerDetailResponse,
  CustomerEntity,
  CustomerListResponse,
  CustomerCsvUploadResult,
  Dunning,
  DunningPayload,
  EFT,
  EftPayload,
  Statement,
  StatementPayload,
  UpdateCustomerPayload,
  VAT,
  VatPayload,
} from '../models/customer.model';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

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

  getCustomers(companyId: number, page = 0, size = 10): Observable<CustomerListResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<CustomerListResponse>(
      `${this.baseUrl}/customer/company/${companyId}?page=${page}&size=${size}`,
      { headers },
    );
  }

  createCustomer(
    companyId: number,
    data: CreateCustomerPayload,
    userId?: number,
  ): Observable<ApiResponse<CustomerEntity>> {
    const headers = getAuthHeaders();
    const resolvedUserId = userId ?? this.getStoredUserId();
    return this.http.post<ApiResponse<CustomerEntity>>(
      `${this.baseUrl}/customer/${resolvedUserId}/${companyId}`,
      data,
      {
        headers,
      },
    );
  }

  saveAddress(customerId: number, data: AddressPayload): Observable<ApiResponse<Address>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<Address>>(
      `${this.baseUrl}/customer/${customerId}/address`,
      data,
      {
        headers,
      },
    );
  }

  saveApplication(
    customerId: number,
    data: CashApplicationPayload,
  ): Observable<ApiResponse<CashApplication>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<CashApplication>>(
      `${this.baseUrl}/customer/${customerId}/cash-application`,
      data,
      {
        headers,
      },
    );
  }

  saveStatement(customerId: number, data: StatementPayload): Observable<ApiResponse<Statement>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<Statement>>(
      `${this.baseUrl}/customer/${customerId}/statement`,
      data,
      { headers },
    );
  }

  saveEft(customerId: number, data: EftPayload): Observable<ApiResponse<EFT>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<EFT>>(`${this.baseUrl}/customer/${customerId}/eft`, data, {
      headers,
    });
  }

  saveVat(customerId: number, data: VatPayload): Observable<ApiResponse<VAT>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<VAT>>(`${this.baseUrl}/customer/${customerId}/vat`, data, {
      headers,
    });
  }

  saveCredit(customerId: number, data: DunningPayload): Observable<ApiResponse<Dunning>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<Dunning>>(
      `${this.baseUrl}/customer/${customerId}/dunning-credit`,
      data,
      {
        headers,
      },
    );
  }

  getCustomerById(id: number): Observable<CustomerDetailResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<CustomerDetailResponse>(`${this.baseUrl}/customer/${id}`, { headers });
  }

  updateCustomer(id: number, data: UpdateCustomerPayload): Observable<CustomerDetailResponse> {
    const headers = getAuthHeaders();
    return this.http.patch<CustomerDetailResponse>(`${this.baseUrl}/customer/${id}`, data, {
      headers,
    });
  }

  deleteCustomer(id: number): Observable<ApiResponse<null>> {
    const headers = getAuthHeaders();
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/customer/${id}`, { headers });
  }

  getCustomerInvoicesById(id: number): Observable<CustomerInvoiceListResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<CustomerInvoiceListResponse>(`${this.baseUrl}/invoice/customer/${id}`, {
      headers,
    });
  }

  getInvoiceDetail(id: number): Observable<InvoiceDetailResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<InvoiceDetailResponse>(`${this.baseUrl}/invoice/${id}`, { headers });
  }

  uploadCsv(companyId: number, data: FormData): Observable<ApiResponse<CustomerCsvUploadResult>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<CustomerCsvUploadResult>>(
      `${this.baseUrl}/customer/import-csv?companyId=${companyId}`,
      data,
      {
        headers,
      },
    );
  }

  downloadTemplate(): Observable<any> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get(`${this.baseUrl}/customer/import/template-metadata`, {headers});
  }
}
