import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  CreateWriteOffPayload,
  WriteOffPageResponse,
} from '../models/write-off.model';

@Injectable({
  providedIn: 'root',
})
export class WriteOffService {
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

  createWriteOff(
    data: CreateWriteOffPayload,
    companyId: number,
    invoiceId: number,
  ): Observable<WriteOffPageResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<WriteOffPageResponse>(
      `${this.baseUrl}/write-offs/company/${companyId}/invoice/${invoiceId}`,
      data,
      {
        headers,
      }
    );
  }

  getCompanyWriteOff(
    companyId: number,
    page = 0,
    size = 25,
  ): Observable<WriteOffPageResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<WriteOffPageResponse>(
      `${this.baseUrl}/write-offs/company/${companyId}?page=${page}&size=${size}`,
      {
        headers,
      }
    );
  }
}
