import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SignupService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  signup(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users`, data);
  }

  setPassword(data: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/companies/user/set-password`, data);
  }
}
