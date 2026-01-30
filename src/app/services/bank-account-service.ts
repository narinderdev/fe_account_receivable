import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  BankAccountListResponse,
  BankGlMappingRequest,
  BankGlMappingResponse,
  CreateBankAccountPayload,
  CreateBankAccountResponse,
  UpdateBankGlMappingPayload,
} from '../models/bank-account.model';

@Injectable({
  providedIn: 'root',
})
export class BankAccountService {
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

  getBankAccounts(companyId: number): Observable<BankAccountListResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<BankAccountListResponse>(
      `${this.baseUrl}/api/companies/${companyId}/bank-accounts`,
      { headers }
    );
  }

  createBankAccount(
    companyId: number,
    payload: CreateBankAccountPayload
  ): Observable<CreateBankAccountResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<CreateBankAccountResponse>(
      `${this.baseUrl}/api/companies/${companyId}/banking`,
      payload,
      { headers }
    );
  }

  createBankGlMapping(
    companyId: number,
    payload: BankGlMappingRequest
  ): Observable<BankGlMappingResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<BankGlMappingResponse>(
      `${this.baseUrl}/api/bank-gl-mappings/company/${companyId}`,
      payload,
      { headers }
    );
  }

  getBankAccountGlMapping(bankAccountId: number): Observable<BankGlMappingResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<BankGlMappingResponse>(
      `${this.baseUrl}/api/companies/${bankAccountId}/gl-mapping`,
      { headers }
    );
  }

  updateBankGlMapping(
    companyId: number,
    mappingId: number,
    payload: UpdateBankGlMappingPayload
  ): Observable<BankGlMappingResponse> {
    const headers = this.getAuthHeaders();
    return this.http.put<BankGlMappingResponse>(
      `${this.baseUrl}/api/bank-gl-mappings/company/${companyId}/${mappingId}`,
      payload,
      { headers }
    );
  }
}
