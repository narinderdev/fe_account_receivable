import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import {
  CompanyEntity,
  CompanyPageResponse,
  CompanyResponse,
  CreateCompanyPayload,
  CreateCompanyResponse,
  CompanyAddressInput,
  CreateAddressResponse,
  FinancialSettingsInput,
  CreateBankingPayload,
} from '../models/company.model';
import { environment } from '../../environments/environment';
import {
  CompanyUsersResponse,
  InviteUserRequest,
  InviteUserResponse,
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
      'address',
      'financial',
      'payment',
      'bankAccounts',
      'users',
    ],
    address: [
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
  private readonly addressFieldList = [
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
  ];

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
      'ngrok-skip-browser-warning': 'true',
    });
  }

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
    const headers = this.getAuthHeadersWithNgrok();
    const resolvedUserId = userId ?? this.getStoredUserId();

    return this.http.get<CompanyPageResponse>(
      `${this.baseUrl}/api/companies/user/${resolvedUserId}?page=${page}&size=${size}`,
      { headers }
    );
  }

  createCompany(
    data: CreateCompanyPayload,
    userId?: number | null
  ): Observable<CreateCompanyResponse> {
    const headers = this.getAuthHeaders();
    const resolvedUserId = userId ?? this.getStoredUserId();

    if (resolvedUserId) {
      return this.http.post<CreateCompanyResponse>(
        `${this.baseUrl}/api/companies/${resolvedUserId}`,
        data,
        { headers }
      );
    }
    return this.http.post<CreateCompanyResponse>(`${this.baseUrl}/api/companies`, data, {
      headers,
    });
  }

  createAddress(companyId: number, data: CompanyAddressInput): Observable<CreateAddressResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<CreateAddressResponse>(
      `${this.baseUrl}/api/companies/${companyId}/company-address`,
      data,
      { headers }
    );
  }

  createFinancialSettings(
    companyId: number,
    data: FinancialSettingsInput
  ): Observable<CompanyResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<CompanyResponse>(
      `${this.baseUrl}/api/companies/${companyId}/financial-settings`,
      data,
      { headers }
    );
  }

  createBanking(companyId: number, data: CreateBankingPayload): Observable<CompanyResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<CompanyResponse>(
      `${this.baseUrl}/api/companies/${companyId}/banking`,
      data,
      { headers }
    );
  }

  inviteUser(companyId: number, data: InviteUserRequest): Observable<InviteUserResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<InviteUserResponse>(
      `${this.baseUrl}/api/companies/${companyId}/users`,
      data,
      { headers }
    );
  }

  getUsers(companyId: number): Observable<CompanyUsersResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<CompanyUsersResponse>(`${this.baseUrl}/api/companies/users/${companyId}`, {
      headers,
    });
  }

  getCompanyById(id: number): Observable<CompanyResponse> {
    const headers = this.getAuthHeadersWithNgrok();
    return this.http.get<CompanyResponse>(`${this.baseUrl}/api/companies/${id}`, { headers });
  }

  updateCompany(id: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.baseUrl}/api/companies/${id}/update`, data, { headers });
  }

  deleteCompany(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.baseUrl}/api/companies/${id}`, { headers });
  }

  setEditingCompany(data: CompanyEntity | null): void {
    this.editingCompanySubject.next(data);
  }

  getEditingCompanySnapshot(): CompanyEntity | null {
    return this.editingCompanySubject.value;
  }

  setOriginalCompany(data: CompanyEntity | null): void {
    this.originalCompanySubject.next(data);
  }

  getOriginalCompanySnapshot(): CompanyEntity | null {
    return this.originalCompanySubject.value;
  }

  getChangedCompanyPayload(): Record<string, any> {
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

  private extractEditableFields(data: CompanyEntity | null): Record<string, any> | null {
    if (!data) return null;

    const result: Record<string, any> = {};
    const rootKeys = this.editableFieldMap.root;

    rootKeys.forEach((key) => {
      const value = this.resolveEditableValue(data, key);

      if (key === 'financial' || key === 'payment' || key === 'address') {
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

  private resolveEditableValue(data: CompanyEntity, key: string): any {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return (data as any)[key];
    }

    if (key === 'address') {
      const merged: Record<string, any> = {};
      const source =
        (data as any).address ??
        (data as any).companyAddress ??
        null;
      if (source) {
        this.addressFieldList.forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(source, field)) {
            merged[field] = source[field];
          }
        });
      }
      this.addressFieldList.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
          merged[field] = (data as any)[field];
        }
      });
      return Object.keys(merged).length ? merged : null;
    }

    if (key === 'financial') {
      return (data as any).financial ?? (data as any).financialSettings ?? null;
    }

    if (key === 'payment') {
      return (data as any).payment ?? (data as any).paymentSettings ?? null;
    }

    return null;
  }

  private pickFields(source: any, allowed: readonly string[]): Record<string, any> | null {
    if (!source) return null;
    const picked: Record<string, any> = {};
    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(source, field)) {
        picked[field] = source[field];
      }
    });
    return picked;
  }

  private computeDiff(
    updated: Record<string, any>,
    original: Record<string, any>
  ): Record<string, any> {
    const diff: Record<string, any> = {};
    this.editableFieldMap.root.forEach((key) => {
      const newValue = updated?.[key];
      const oldValue = original?.[key];

      if (key === 'financial' || key === 'payment' || key === 'address') {
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

  private diffObjects(newObj: any, oldObj: any): Record<string, any> {
    const diff: Record<string, any> = {};
    if (!newObj) return diff;

    Object.keys(newObj).forEach((key) => {
      if (!this.valuesEqual(newObj[key], oldObj?.[key])) {
        diff[key] = newObj[key];
      }
    });

    return diff;
  }

  private arraysEqual(a: any, b: any): boolean {
    const aStr = JSON.stringify(a ?? []);
    const bStr = JSON.stringify(b ?? []);
    return aStr === bStr;
  }

  private valuesEqual(a: any, b: any): boolean {
    if (Array.isArray(a) || Array.isArray(b)) {
      return this.arraysEqual(a, b);
    }
    return a === b;
  }
}
