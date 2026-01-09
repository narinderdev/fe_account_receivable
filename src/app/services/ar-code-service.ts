import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateArCodePayload,
  CreateArCodeResponse,
  ArCodeListResponse,
  DeleteArCodeResponse,
  UpdateArCodePayload,
  UpdateArCodeResponse,
  ToggleArCodeResponse,
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

  getCode(userId: number): Observable<ArCodeListResponse> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<ArCodeListResponse>(`${this.baseUrl}/codes/ar-codes/${userId}`, {
      headers,
    });
  }

  createCode(data: CreateArCodePayload, userId: number): Observable<CreateArCodeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<CreateArCodeResponse>(`${this.baseUrl}/codes/ar-codes/${userId}`, data, {
      headers,
    });
  }

  updateCode(
    codeId: number,
    userId: number,
    data: UpdateArCodePayload
  ): Observable<UpdateArCodeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.put<UpdateArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${codeId}/${userId}`,
      data,
      { headers }
    );
  }

  deleteCode(codeId: number, userId: number): Observable<DeleteArCodeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.delete<DeleteArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${codeId}/${userId}`,
      {
        headers,
      }
    );
  }

  activateCode(codeId: number, userId: number): Observable<ToggleArCodeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.patch<ToggleArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${codeId}/active/${userId}`,
      {},
      { headers }
    );
  }

  deactivateCode(codeId: number, userId: number): Observable<ToggleArCodeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.patch<ToggleArCodeResponse>(
      `${this.baseUrl}/codes/ar-codes/${codeId}/inactive/${userId}`,
      {},
      { headers }
    );
  }
}
