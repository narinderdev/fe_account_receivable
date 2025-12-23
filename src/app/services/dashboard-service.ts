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

  getDashboardCardData(companyId: number): Observable<DashboardSummaryResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get<DashboardSummaryResponse>(
      `${this.baseUrl}/dashboard/summary/company/${companyId}`,
      { headers }
    );
  }
}
