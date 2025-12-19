import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getDashboardCardData(): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get(`${this.baseUrl}/dashboard/summary`, { headers });
  }
}
