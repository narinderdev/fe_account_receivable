import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { GlTransactionPage } from '../models/gl-transaction.model';
import { getAuthHeadersWithNgrok } from './auth-headers.util';

@Injectable({
  providedIn: 'root',
})
export class GlTransactionService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getTransactions(
    companyId: number,
    params: {
      page?: number;
      size?: number;
      months?: number;
      fromDate?: string;
      toDate?: string;
    } = {},
  ): Observable<GlTransactionPage> {
    const headers = getAuthHeadersWithNgrok();

    const query: string[] = [];
    query.push(`page=${params.page ?? 0}`);
    query.push(`size=${params.size ?? 10}`);

    if (params.months !== undefined && params.months !== null) {
      query.push(`months=${params.months}`);
    }
    if (params.fromDate) {
      query.push(`fromDate=${params.fromDate}`);
    }
    if (params.toDate) {
      query.push(`toDate=${params.toDate}`);
    }

    const queryString = query.join('&');

    return this.http.get<GlTransactionPage>(
      `${this.baseUrl}/api/gl/transactions/company/${companyId}?${queryString}`,
      { headers },
    );
  }
}
