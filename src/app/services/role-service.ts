import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateRoleRequest, RolesResponse } from '../models/company-users.model';
import { environment } from '../../environments/environment';

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
      'ngrok-skip-browser-warning': 'true'
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

  getPermissions(): Observable<any> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<any>(`${this.baseUrl}/permissions`, { headers });
  }
}