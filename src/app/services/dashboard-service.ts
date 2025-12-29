import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardSummaryResponse } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  private getAuthHeadersWithNgrok(): HttpHeaders {
    const token = localStorage.getItem('logintoken');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    });
  }

  getDashboardCardData(companyId: number): Observable<DashboardSummaryResponse> {
    const headers = this.getAuthHeadersWithNgrok();

    return this.http.get<DashboardSummaryResponse>(
      `${this.baseUrl}/dashboard/summary/company/${companyId}`,
      { headers }
    );
  }
}
