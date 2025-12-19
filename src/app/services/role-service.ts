import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RolesResponse } from '../models/company-users.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getRoles(): Observable<RolesResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get<RolesResponse>(`${this.baseUrl}/api/roles`, { headers });
  }

  createRoles(data: any): Observable<RolesResponse> {
    return this.http.post<RolesResponse>(`${this.baseUrl}/api/roles`, data);
  }

  getPermissions(): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get<any>(`${this.baseUrl}/permissions`, { headers });
  }
}
