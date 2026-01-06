import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SetPasswordRequest,
  SetPasswordResponse,
  SignupRequest,
  SignupResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class SignupService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  signup(data: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${this.baseUrl}/auth/signup`, data);
  }

  setPassword(data: SetPasswordRequest): Observable<SetPasswordResponse> {
    return this.http.post<SetPasswordResponse>(
      `${this.baseUrl}/api/companies/user/set-password`,
      data
    );
  }

  verifyOtp(data: VerifyOtpRequest): Observable<VerifyOtpResponse> {
    return this.http.post<VerifyOtpResponse>(`${this.baseUrl}/auth/signup/verify`, data);
  }
}
