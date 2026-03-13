import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/customer.model';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

export interface AgingCodePayload {
  bucketName: string;
  startDay: number;
  endDay: number;
  displayOrder: number;
}

export interface AgingCode extends AgingCodePayload {
  id?: number;
  companyId?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export type AgingCodeResponseData = AgingCode | AgingCode[] | null | undefined;

@Injectable({
  providedIn: 'root',
})
export class AgingCodeService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  createAgingCode(companyId: number, payload: AgingCodePayload): Observable<ApiResponse<AgingCode>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<AgingCode>>(
      `${this.baseUrl}/aging-codes/company/${companyId}`,
      payload,
      { headers },
    );
  }

  getAgingCodes(companyId: number): Observable<ApiResponse<AgingCodeResponseData>> {
    const headers = getAuthHeadersWithNgrok(true);
    return this.http.get<ApiResponse<AgingCodeResponseData>>(
      `${this.baseUrl}/aging-codes/company/${companyId}`,
      { headers },
    );
  }

  updateAgingCode(
    agingCodeId: number,
    payload: Partial<AgingCodePayload>,
  ): Observable<ApiResponse<AgingCode>> {
    const headers = getAuthHeaders();
    return this.http.put<ApiResponse<AgingCode>>(
      `${this.baseUrl}/aging-codes/${agingCodeId}`,
      payload,
      { headers },
    );
  }

  deleteAgingCode(agingCodeId: number): Observable<ApiResponse<null>> {
    const headers = getAuthHeaders();
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/aging-codes/${agingCodeId}`, {
      headers,
    });
  }
}
