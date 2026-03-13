import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/customer.model';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

export interface LateFeePayload {
  gracePeriodDays: number;
  lateFeePercentage: number;
  mandatoryCharge: number;
}

export interface LateFeeRule extends LateFeePayload {
  id?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  company?: unknown;
}

export type LateFeeResponseData = LateFeeRule | LateFeeRule[] | null | undefined;

@Injectable({
  providedIn: 'root',
})
export class LateFeeService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  createLateFee(companyId: number, payload: LateFeePayload): Observable<ApiResponse<LateFeeRule>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<LateFeeRule>>(`${this.baseUrl}/late-fee/${companyId}`, payload, {
      headers,
    });
  }

  updateLateFee(lateFeeId: number, payload: Partial<LateFeePayload>): Observable<ApiResponse<LateFeeRule>> {
    const headers = getAuthHeaders();
    return this.http.put<ApiResponse<LateFeeRule>>(`${this.baseUrl}/late-fee/${lateFeeId}`, payload, {
      headers,
    });
  }

  getLateFees(companyId: number): Observable<ApiResponse<LateFeeResponseData>> {
    const headers = getAuthHeadersWithNgrok(true);
    return this.http.get<ApiResponse<LateFeeResponseData>>(`${this.baseUrl}/late-fee/${companyId}`, {
      headers,
    });
  }

  deleteLateFee(lateFeeId: number): Observable<ApiResponse<LateFeeRule>> {
    const headers = getAuthHeaders();
    return this.http.delete<ApiResponse<LateFeeRule>>(`${this.baseUrl}/late-fee/${lateFeeId}`, {
      headers,
    });
  }
}
