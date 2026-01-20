import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

@Injectable({
  providedIn: 'root',
})
export class ArCodeService {
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

  getCode(companyId: number): Observable<ArCodeListResponse> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<ArCodeListResponse>(`${this.baseUrl}/codes/ar-codes/${companyId}`, {
      headers,
    });
  }

  getCodesPage(companyId: number, page = 0, size = 10): Observable<ArCodePageResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<ArCodePageResponse>(
      `${this.baseUrl}/codes/ar-codes/${companyId}?page=${page}&size=${size}`,
      {
        headers,
      }
    );
  }

  createCode(data: CreateArCodePayload, companyId: number): Observable<CreateArCodeResponse> {
    const headers = this.getAuthHeaders();
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
    const headers = this.getAuthHeaders();
    return this.http.put<UpdateArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${codeId}/${companyId}`,
      data,
      { headers }
    );
  }

  deleteCode(codeId: number, companyId: number): Observable<DeleteArCodeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.delete<DeleteArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${codeId}/${companyId}`,
      {
        headers,
      }
    );
  }

  activateCode(codeId: number, companyId: number): Observable<ToggleArCodeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.patch<ToggleArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${codeId}/active/${companyId}`,
      {},
      { headers }
    );
  }

  deactivateCode(codeId: number, companyId: number): Observable<ToggleArCodeResponse> {
    const headers = this.getAuthHeaders();
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
    const headers = this.getAuthHeaders();
    return this.http.post<ArGlMappingResponse>(
      `${this.baseUrl}/api/ar-gl-mappings/companies/${companyId}/user/${userId}`,
      data,
      { headers }
    );
  }

  getArGlMapping(arCodeId: number): Observable<ArGlMappingResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<ArGlMappingResponse>(
      `${this.baseUrl}/api/ar-gl-mappings/ar-code/${arCodeId}`,

      { headers }
    );
  }

  updateArGlMapping(arCodeId: number, companyId: number, userId:number, data:any): Observable<any> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.put<any>(
      `${this.baseUrl}/api/ar-gl-mappings/companies/${companyId}/user/${userId}/ar-code/${arCodeId}`,
      data,
      { headers }
    );
  }
}
