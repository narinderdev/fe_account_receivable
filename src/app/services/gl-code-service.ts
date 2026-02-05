import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateGlCodePayload,
  CreateGlCodeResponse,
  GlCodeListResponse,
  GlCodePageResponse,
  UpdateGlCodePayload,
  UpdateGlCodeResponse,
} from '../models/gl-code.model';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class GlCodeService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getGlCode(companyId: number): Observable<GlCodeListResponse> {
    const headers = getAuthHeadersWithNgrok();

    return this.http.get<GlCodeListResponse>(`${this.baseUrl}/api/gl-codes/company/${companyId}`, {
      headers,
    });
  }

  getGlCodesPage(companyId: number, page = 0, size = 10): Observable<GlCodePageResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<GlCodePageResponse>(
      `${this.baseUrl}/api/gl-codes/company/${companyId}?page=${page}&size=${size}`,
      {
        headers,
      }
    );
  }

  createGlCode(
    data: CreateGlCodePayload,
    companyId: number,
    userId: number
  ): Observable<CreateGlCodeResponse> {
    const headers = getAuthHeaders();
    return this.http.post<CreateGlCodeResponse>(
      `${this.baseUrl}/api/gl-codes/company/${companyId}/user/${userId}`,
      data,
      {
        headers,
      }
    );
  }

  updateGlCode(
    glCodeId: number,
    companyId: number,
    data: UpdateGlCodePayload
  ): Observable<UpdateGlCodeResponse> {
    const headers = getAuthHeaders();
    return this.http.put<UpdateGlCodeResponse>(
      `${this.baseUrl}/api/gl-codes/company/${companyId}/${glCodeId}`,
      data,
      {
        headers,
      }
    );
  }
}
