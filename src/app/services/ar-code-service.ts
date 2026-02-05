import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateArCodePayload,
  CreateArCodeResponse,
  ArCodeListResponse,
  ArCodePageResponse,
  DeleteArCodeResponse,
  UpdateArCodePayload,
  UpdateArCodeResponse,
  ToggleArCodeResponse,
  ArGlMappingPayload,
  ArGlMappingResponse,
} from '../models/ar-code.model';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class ArCodeService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getCode(companyId: number): Observable<ArCodeListResponse> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<ArCodeListResponse>(`${this.baseUrl}/codes/ar-codes/${companyId}`, {
      headers,
    });
  }

  getCodesPage(companyId: number, page = 0, size = 10): Observable<ArCodePageResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<ArCodePageResponse>(
      `${this.baseUrl}/codes/ar-codes/${companyId}?page=${page}&size=${size}`,
      {
        headers,
      }
    );
  }

  createCode(data: CreateArCodePayload, companyId: number): Observable<CreateArCodeResponse> {
    const headers = getAuthHeaders();
    return this.http.post<CreateArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${companyId}`,
      data,
      {
        headers,
      }
    );
  }

  updateCode(
    codeId: number,
    companyId: number,
    data: UpdateArCodePayload
  ): Observable<UpdateArCodeResponse> {
    const headers = getAuthHeaders();
    return this.http.put<UpdateArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${codeId}/${companyId}`,
      data,
      { headers }
    );
  }

  deleteCode(codeId: number, companyId: number): Observable<DeleteArCodeResponse> {
    const headers = getAuthHeaders();
    return this.http.delete<DeleteArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${codeId}/${companyId}`,
      {
        headers,
      }
    );
  }

  activateCode(codeId: number, companyId: number): Observable<ToggleArCodeResponse> {
    const headers = getAuthHeaders();
    return this.http.patch<ToggleArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${codeId}/active/${companyId}`,
      {},
      { headers }
    );
  }

  deactivateCode(codeId: number, companyId: number): Observable<ToggleArCodeResponse> {
    const headers = getAuthHeaders();
    return this.http.patch<ToggleArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${codeId}/inactive/${companyId}`,
      {},
      { headers }
    );
  }

  arglMapping(
    companyId: number,
    userId: number,
    data: ArGlMappingPayload
  ): Observable<ArGlMappingResponse> {
    const headers = getAuthHeaders();
    return this.http.post<ArGlMappingResponse>(
      `${this.baseUrl}/api/ar-gl-mappings/companies/${companyId}/user/${userId}`,
      data,
      { headers }
    );
  }

  getArGlMapping(arCodeId: number): Observable<ArGlMappingResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<ArGlMappingResponse>(
      `${this.baseUrl}/api/ar-gl-mappings/ar-code/${arCodeId}`,

      { headers }
    );
  }

  updateArGlMapping(arCodeId: number, companyId: number, userId:number, data:any): Observable<any> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.put<any>(
      `${this.baseUrl}/api/ar-gl-mappings/companies/${companyId}/user/${userId}/ar-code/${arCodeId}`,
      data,
      { headers }
    );
  }
}
