import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

export interface MfaSetupData {
  secret?: string;
  qrCodeImage?: string;
}

export interface ApiResponse<T> {
  status?: string;
  statusCode?: number;
  message?: string;
  data?: T;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getMfaSetup(): Observable<ApiResponse<MfaSetupData>> {
    const headers = getAuthHeadersWithNgrok(true);
    return this.http.get<ApiResponse<MfaSetupData>>(`${this.baseUrl}/auth/mfa/setup`, { headers });
  }

  sendEmailMfaCode(): Observable<ApiResponse<unknown>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/auth/email/send`, {}, { headers });
  }

  verifyEmailMfaCode(code: string): Observable<ApiResponse<unknown>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<unknown>>(
      `${this.baseUrl}/auth/mfa/email/verify`,
      { code },
      { headers }
    );
  }

  verifyMfaSetup(code: string): Observable<ApiResponse<unknown>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<unknown>>(
      `${this.baseUrl}/auth/mfa/verify-setup`,
      { code },
      { headers }
    );
  }

  disableMfa(code: string): Observable<ApiResponse<unknown>> {
    const headers = getAuthHeaders();
    return this.http.post<ApiResponse<unknown>>(
      `${this.baseUrl}/auth/mfa/disable`,
      { code },
      { headers }
    );
  }

  verifyLoginMfa(code: string, token: string): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/auth/login/mfa`, {
      code,
      mfa_token: token,
    });
  }
}
