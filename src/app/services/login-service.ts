import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  login(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth`, data);
  }
}
