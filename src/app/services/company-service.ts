import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CompanyService {
  private baseUrl = 'https://2b43e2f169bd.ngrok-free.app';
  private http = inject(HttpClient);
  private editingCompanySubject = new BehaviorSubject<any | null>(null);
  private originalCompanySubject = new BehaviorSubject<any | null>(null);
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
      'defaultArAccountCode',
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

  getCompany(page: number = 0, size: number = 10): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get(`${this.baseUrl}/api/companies?page=${page}&size=${size}`, { headers });
  }

  getRoles(): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });

    return this.http.get(`${this.baseUrl}/api/roles`, { headers });
  }

  createCompany(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/companies`, data);
  }

  createFinancialSettings(companyId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/companies/${companyId}/financial-settings`, data);
  }

  createBanking(companyId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/companies/${companyId}/banking`, data);
  }

  inviteUser(companyId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/companies/${companyId}/users`, data);
  }

  uploadBalance(companyId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/companies/${companyId}/opening-balance-file`, data);
  }

  getCompanyById(id: number): Observable<any> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
    });
    return this.http.get(`${this.baseUrl}/api/companies/${id}`, { headers });
  }

  updateCompany(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/api/companies/${id}/update`, data);
  }

  setEditingCompany(data: any | null) {
    this.editingCompanySubject.next(data);
  }

  getEditingCompanySnapshot() {
    return this.editingCompanySubject.value;
  }

  setOriginalCompany(data: any | null) {
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

  private extractEditableFields(data: any | null) {
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
