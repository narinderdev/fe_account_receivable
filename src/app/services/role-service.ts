import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateRoleRequest, RolesResponse } from '../models/company-users.model';
import { environment } from '../../environments/environment';

export interface SecurityReportByRoleResponse {
  statusCode: number;
  status: string;
  message: string;
  data: Array<{
    role: string;
    objects: Record<string, string[]>;
  }>;
}

export interface SecurityReportByObjectResponse {
  statusCode: number;
  status: string;
  message: string;
  data: Record<string, Record<string, string[]>>;
}

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private getAuthHeadersWithNgrok(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      // 'ngrok-skip-browser-warning': 'true'
    });
  }

  getRoles(companyId: number): Observable<RolesResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<RolesResponse>(`${this.baseUrl}/api/roles/company/${companyId}`, { headers });
  }

  createRoles(companyId: number, data: CreateRoleRequest): Observable<RolesResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<RolesResponse>(`${this.baseUrl}/api/roles/company/${companyId}`, data, { headers });
  }

  updateRoles(companyId: number, roleId:number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.baseUrl}/api/roles/${roleId}/company/${companyId}`, data, { headers });
  }

  getSecurityReportByRole(companyId: number): Observable<SecurityReportByRoleResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<SecurityReportByRoleResponse>(
      `${this.baseUrl}/api/security-report/by-role`,
      {
        headers,
        params: { companyId: String(companyId) },
      },
    );
  }

  getSecurityReportByObject(companyId: number): Observable<SecurityReportByObjectResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<SecurityReportByObjectResponse>(
      `${this.baseUrl}/api/security-report/by-object`,
      {
        headers,
        params: { companyId: String(companyId) },
      },
    );
  }
  
}
