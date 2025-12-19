import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { InvoicePage } from '../models/invoice.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getInvoices(page = 0, size = 10): Observable<InvoicePage> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get<InvoicePage>(
      `${this.baseUrl}/invoice?page=${page}&size=${size}`,
      { headers }
    );
  }

  createInvoice(customerId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/invoice/${customerId}`, data);
  }

  sendInvoice(invoiceId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/invoice/send/${invoiceId}`, null);
  }

  getUnpaidInvoices(customerId: number): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get(`${this.baseUrl}/invoice/unpaid/${customerId}`, {headers});
  }
}
