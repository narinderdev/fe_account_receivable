import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AgingResponse, AgingFilters } from '../models/aging.model';

@Injectable({
  providedIn: 'root',
})
export class AgingService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  // ✅ Helper method to get headers with both auth and ngrok skip (for GET requests)
  private getAuthHeadersWithNgrok(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true'
    });
  }

  getAging(companyId: number, filters?: AgingFilters): Observable<AgingResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    let params = new HttpParams();

    if (filters) {
      if (filters.customerId) {
        params = params.set('customerId', filters.customerId);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.asOfDate) {
        params = params.set('asOfDate', filters.asOfDate);
      }
    }

    return this.http.get<AgingResponse>(`${this.baseUrl}/reports/aging/company/${companyId}`, {
      headers,
      params,
    });
  }
}