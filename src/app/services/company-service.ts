import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { CompanyEntity, CompanyPageResponse, CompanyResponse } from '../models/company.model';
import { environment } from '../../environments/environment';
import {
  CompanyUsersResponse,
  InviteUserRequest,
  InviteUserResponse,
  RolesResponse,
} from '../models/company-users.model';

@Injectable({
  providedIn: 'root',
})
export class CompanyService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private editingCompanySubject = new BehaviorSubject<CompanyEntity | null>(null);
  private originalCompanySubject = new BehaviorSubject<CompanyEntity | null>(null);
  editingCompany$ = this.editingCompanySubject.asObservable();
  originalCompany$ = this.originalCompanySubject.asObservable();

  private readonly editableFieldMap = {
    root: [
      'legalName',
      'tradeName',
      'companyCode',
      'country',
      'baseCurrency',
      'timeZone',
      'addressLine1',
      'city',
      'stateProvince',
      'postalCode',
      'addressCountry',
      'primaryContactName',
      'primaryContactEmail',
      'primaryContactPhone',
      'website',
      'primaryContactCountry',
      'financial',
      'payment',
      'bankAccounts',
      'users',
    ],
    financial: [
      'fiscalYearStartMonth',
      // 'defaultArAccountCode',
      'revenueRecognitionMode',
      'defaultTaxHandling',
      'defaultPaymentTerms',
      'allowOtherTerms',
      'enableCreditLimitChecking',
      'agingBucketConfig',
      'dunningFrequencyDays',
      'enableAutomatedDunningEmails',
      'defaultCreditLimit',
    ],
    payment: [
      'acceptCheck',
      'acceptCreditCard',
      'acceptBankTransfer',
      'acceptCash',
      'remittanceInstructions',
    ],
    bankAccounts: ['bankName', 'accountNumber', 'ifscSwift', 'currency', 'isDefault'],
    users: ['id', 'name', 'email', 'status', 'roleId'],
  } as const;

  private getStoredUserId(): number | null {
    const raw = localStorage.getItem('signupUserId');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }

  getCompany(
    page: number = 0,
    size: number = 10,
    userId?: number | null
  ): Observable<CompanyPageResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    const resolvedUserId = userId ?? this.getStoredUserId();

    // if (resolvedUserId) {
    return this.http.get<CompanyPageResponse>(
      `${this.baseUrl}/api/companies/user/${resolvedUserId}?page=${page}&size=${size}`,
      { headers }
    );
    // }
  }

  createCompany(data: any, userId?: number | null): Observable<any> {
    const resolvedUserId = userId ?? this.getStoredUserId();
    if (resolvedUserId) {
      return this.http.post(`${this.baseUrl}/api/companies/${resolvedUserId}`, data);
    }
    return this.http.post(`${this.baseUrl}/api/companies`, data);
  }

  createAddress(companyId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/companies/${companyId}/company-address`, data);
  }

  createFinancialSettings(companyId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/companies/${companyId}/financial-settings`, data);
  }

  createBanking(companyId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/companies/${companyId}/banking`, data);
  }

  inviteUser(companyId: number, data: InviteUserRequest): Observable<InviteUserResponse> {
    return this.http.post<InviteUserResponse>(
      `${this.baseUrl}/api/companies/${companyId}/users`,
      data
    );
  }

  getUsers(companyId: number): Observable<CompanyUsersResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get<CompanyUsersResponse>(`${this.baseUrl}/api/companies/users/${companyId}`, {
      headers,
    });
  }

  uploadBalance(companyId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/companies/${companyId}/opening-balance-file`, data);
  }

  getCompanyById(id: number): Observable<CompanyResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get<CompanyResponse>(`${this.baseUrl}/api/companies/${id}`, { headers });
  }

  updateCompany(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/api/companies/${id}/update`, data);
  }

  deleteCompany(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/companies/${id}`);
  }

  setEditingCompany(data: CompanyEntity | null) {
    this.editingCompanySubject.next(data);
  }

  getEditingCompanySnapshot() {
    return this.editingCompanySubject.value;
  }

  setOriginalCompany(data: CompanyEntity | null) {
    this.originalCompanySubject.next(data);
  }

  getOriginalCompanySnapshot() {
    return this.originalCompanySubject.value;
  }

  getChangedCompanyPayload(): any {
    const updated = this.extractEditableFields(this.getEditingCompanySnapshot());
    const original = this.extractEditableFields(this.getOriginalCompanySnapshot());

    if (!updated) {
      return {};
    }

    if (!original) {
      return updated;
    }

    return this.computeDiff(updated, original);
  }

  private extractEditableFields(data: CompanyEntity | null) {
    if (!data) return null;

    const result: any = {};
    const rootKeys = this.editableFieldMap.root;

    rootKeys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(data, key)) {
        return;
      }

      const value = data[key];

      if (key === 'financial' || key === 'payment') {
        result[key] = this.pickFields(value, this.editableFieldMap[key]);
      } else if (key === 'bankAccounts' || key === 'users') {
        result[key] = Array.isArray(value)
          ? value
              .map((item) => this.pickFields(item, this.editableFieldMap[key]))
              .filter((item) => item)
          : [];
      } else {
        result[key] = value;
      }
    });

    return result;
  }

  private pickFields(source: any, allowed: readonly string[]) {
    if (!source) return null;
    const picked: any = {};
    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(source, field)) {
        picked[field] = source[field];
      }
    });
    return picked;
  }

  private computeDiff(updated: any, original: any) {
    const diff: any = {};
    this.editableFieldMap.root.forEach((key) => {
      const newValue = updated?.[key];
      const oldValue = original?.[key];

      if (key === 'financial' || key === 'payment') {
        const nestedDiff = this.diffObjects(newValue, oldValue);
        if (Object.keys(nestedDiff).length) {
          diff[key] = nestedDiff;
        }
      } else if (key === 'bankAccounts' || key === 'users') {
        if (!this.arraysEqual(newValue, oldValue)) {
          diff[key] = newValue || [];
        }
      } else if (!this.valuesEqual(newValue, oldValue)) {
        diff[key] = newValue;
      }
    });

    return diff;
  }

  private diffObjects(newObj: any, oldObj: any) {
    const diff: any = {};
    if (!newObj) return diff;

    Object.keys(newObj).forEach((key) => {
      if (!this.valuesEqual(newObj[key], oldObj?.[key])) {
        diff[key] = newObj[key];
      }
    });

    return diff;
  }

  private arraysEqual(a: any, b: any) {
    const aStr = JSON.stringify(a ?? []);
    const bStr = JSON.stringify(b ?? []);
    return aStr === bStr;
  }

  private valuesEqual(a: any, b: any) {
    if (Array.isArray(a) || Array.isArray(b)) {
      return this.arraysEqual(a, b);
    }
    return a === b;
  }
}
