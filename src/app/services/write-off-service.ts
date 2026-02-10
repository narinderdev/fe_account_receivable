import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreateWriteOffPayload, WriteOffPageResponse } from '../models/write-off.model';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class WriteOffService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  createWriteOff(
    data: CreateWriteOffPayload,
    companyId: number,
    invoiceId: number
  ): Observable<WriteOffPageResponse> {
    const headers = getAuthHeaders();
    return this.http.post<WriteOffPageResponse>(
      `${this.baseUrl}/write-offs/company/${companyId}/invoice/${invoiceId}`,
      data,
      {
        headers,
      }
    );
  }

  getCompanyWriteOff(
    companyId: number,
    status?: 'CREATED' | 'APPROVED',
    page = 0,
    size = 10
  ): Observable<WriteOffPageResponse> {
    const headers = getAuthHeadersWithNgrok();
    const statusQuery = status ? `&status=${status}` : '';
    return this.http.get<WriteOffPageResponse>(
      `${this.baseUrl}/write-offs/company/${companyId}/filter?page=${page}&size=${size}${statusQuery}`,
      {
        headers,
      }
    );
  }

  approveWriteOff(writeoffId: number): Observable<any> {
    const headers = getAuthHeaders();
    return this.http.put<WriteOffPageResponse>(
      `${this.baseUrl}/write-offs/${writeoffId}/approve`,
      {},
      {
        headers,
      }
    );
  }
}
