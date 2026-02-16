import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  PaymentSettingsInput,
  CreateBankingPayload,
  UpdateCompanyPayload,
  EditableBankAccount,
  EditableCompanyUser,
  CompanyDeleteResponse,
} from '../models/company.model';
import { environment } from '../../environments/environment';
import {
  CompanyUsersResponse,
  InviteUserRequest,
  InviteUserResponse,
} from '../models/company-users.model';
import { getAuthHeaders, getAuthHeadersWithNgrok } from './auth-headers.util';

export interface GlobalCompanyConfig {
  paymentTerms?: string[];
}

export interface GlobalCompanyResponse {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: GlobalCompanyConfig;
}

type CompanyBankAccountSource = CompanyEntity['bankAccounts'][number] & EditableBankAccount;
type CompanyUserSource = CompanyEntity['users'][number] & EditableCompanyUser;
type AddressFieldKey = keyof CompanyAddressInput;
type InlineCompanyAddress = {
  [K in AddressFieldKey]?: CompanyAddressInput[K] | undefined;
};

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

  private readonly addressFieldList: (keyof CompanyAddressInput)[] = [
    'addressLine1',
    'city',
    'stateProvince',
    'county',
    'postalCode',
    'addressCountry',
    'primaryContactName',
    'position',
    'primaryContactEmail',
    'primaryContactPhone',
    'website',
    'primaryContactCountry',
  ];
  private readonly financialFieldList: (keyof FinancialSettingsInput)[] = [
    'fiscalYearStartMonth',
    'revenueRecognitionMode',
    'defaultTaxHandling',
    'defaultPaymentTerms',
    'allowOtherTerms',
    'enableCreditLimitChecking',
    'agingBucketConfig',
    'dunningFrequencyDays',
    'enableAutomatedDunningEmails',
    'defaultCreditLimit',
  ];
  private readonly paymentFieldList: (keyof PaymentSettingsInput)[] = [
    'acceptCheck',
    'acceptCreditCard',
    'acceptBankTransfer',
    'acceptCash',
    'remittanceInstructions',
  ];

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
    const headers = getAuthHeadersWithNgrok();
    const resolvedUserId = userId ?? this.getStoredUserId();

    return this.http.get<CompanyPageResponse>(
      `${this.baseUrl}/api/companies/user/${resolvedUserId}?page=${page}&size=${size}`,
      { headers }
    );
  }

  getGlobalCompanySettings(): Observable<GlobalCompanyResponse> {
    const headers = getAuthHeadersWithNgrok(true);
    return this.http.get<GlobalCompanyResponse>(`${this.baseUrl}/companies/global`, { headers });
  }

  createCompany(
    data: CreateCompanyPayload,
    userId?: number | null
  ): Observable<CreateCompanyResponse> {
    const headers = getAuthHeaders();
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
    const headers = getAuthHeaders();
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
    const headers = getAuthHeaders();
    return this.http.post<CompanyResponse>(
      `${this.baseUrl}/api/companies/${companyId}/financial-settings`,
      data,
      { headers }
    );
  }

  createBanking(companyId: number, data: CreateBankingPayload): Observable<CompanyResponse> {
    const headers = getAuthHeaders();
    return this.http.post<CompanyResponse>(
      `${this.baseUrl}/api/companies/${companyId}/banking`,
      data,
      { headers }
    );
  }

  inviteUser(companyId: number, data: InviteUserRequest): Observable<InviteUserResponse> {
    const headers = getAuthHeaders();
    return this.http.post<InviteUserResponse>(
      `${this.baseUrl}/api/companies/${companyId}/users`,
      data,
      { headers }
    );
  }

  getUsers(companyId: number): Observable<CompanyUsersResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<CompanyUsersResponse>(`${this.baseUrl}/api/companies/users/${companyId}`, {
      headers,
    });
  }

  approveCompanyUser(companyId: number, userId: number): Observable<InviteUserResponse> {
    const headers = getAuthHeaders();
    return this.http.post<InviteUserResponse>(
      `${this.baseUrl}/api/companies/${companyId}/users/${userId}/approve`,
      null,
      { headers },
    );
  }

  getCompanyById(id: number): Observable<CompanyResponse> {
    const headers = getAuthHeadersWithNgrok();
    return this.http.get<CompanyResponse>(`${this.baseUrl}/api/companies/${id}`, { headers });
  }

  updateCompany(id: number, data: UpdateCompanyPayload): Observable<CompanyResponse> {
    const headers = getAuthHeaders();
    return this.http.patch<CompanyResponse>(`${this.baseUrl}/api/companies/${id}/update`, data, {
      headers,
    });
  }

  deleteCompany(id: number): Observable<CompanyDeleteResponse> {
    const headers = getAuthHeaders();
    return this.http.delete<CompanyDeleteResponse>(`${this.baseUrl}/api/companies/${id}`, {
      headers,
    });
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

  getChangedCompanyPayload(): UpdateCompanyPayload {
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

  private extractEditableFields(data: CompanyEntity | null): UpdateCompanyPayload | null {
    if (!data) return null;

    const result: UpdateCompanyPayload = {
      legalName: data.legalName,
      tradeName: data.tradeName,
      companyCode: data.companyCode,
      country: data.country,
      baseCurrency: data.baseCurrency,
      timeZone: data.timeZone,
      bankAccounts: [],
      users: [],
    };

    const address = this.buildEditableAddress(data);
    result.address = address ?? null;

    const financial = this.buildEditableFinancial(data);
    result.financial = financial ?? null;

    const payment = this.buildEditablePayment(data);
    result.payment = payment ?? null;

    result.bankAccounts = this.buildEditableBankAccounts(data);
    result.users = this.buildEditableUsers(data);

    return result;
  }

  private buildEditableAddress(data: CompanyEntity): Partial<CompanyAddressInput> | null {
    const merged: Partial<CompanyAddressInput> = {};
    const extended = data as CompanyEntity & { address?: Partial<CompanyAddressInput> | null };
    const inlineValues = data as InlineCompanyAddress;

    this.mergeAddressValues(
      merged,
      this.pickFromSource(extended.address ?? null, this.addressFieldList)
    );
    this.mergeAddressValues(merged, this.pickFromSource(data.companyAddress, this.addressFieldList));

    this.addressFieldList.forEach((field) => {
      const entityValue = inlineValues[field];
      if (entityValue !== undefined) {
        merged[field] = entityValue;
      }
    });

    return Object.keys(merged).length ? merged : null;
  }

  private mergeAddressValues(
    target: Partial<CompanyAddressInput>,
    source: Partial<CompanyAddressInput> | null
  ): void {
    if (!source) {
      return;
    }
    this.addressFieldList.forEach((field) => {
      const value = source[field];
      if (value !== undefined) {
        target[field] = value;
      }
    });
  }

  private buildEditableFinancial(data: CompanyEntity): Partial<FinancialSettingsInput> | null {
    const extended = data as CompanyEntity & { financial?: Partial<FinancialSettingsInput> | null };
    const direct = this.pickFromSource(extended.financial ?? null, this.financialFieldList);
    if (direct) {
      return direct;
    }
    return this.pickFromSource(data.financialSettings, this.financialFieldList);
  }

  private buildEditablePayment(data: CompanyEntity): Partial<PaymentSettingsInput> | null {
    const extended = data as CompanyEntity & { payment?: Partial<PaymentSettingsInput> | null };
    const direct = this.pickFromSource(extended.payment ?? null, this.paymentFieldList);
    if (direct) {
      return direct;
    }
    return this.pickFromSource(data.paymentSettings, this.paymentFieldList);
  }

  private buildEditableBankAccounts(data: CompanyEntity): EditableBankAccount[] {
    const source = (data as { bankAccounts?: CompanyBankAccountSource[] }).bankAccounts ?? [];
    const list = Array.isArray(source) ? source : [];
    return list
      .map((account) => {
        const mapped: EditableBankAccount = {};
        if (account.bankName !== undefined) {
          mapped.bankName = account.bankName;
        }
        if (account.accountNumber !== undefined) {
          mapped.accountNumber = account.accountNumber;
        }
        if (account.ifscSwift !== undefined) {
          mapped.ifscSwift = account.ifscSwift;
        }
        if (account.currency !== undefined) {
          mapped.currency = account.currency;
        }
        if (account.isDefault !== undefined) {
          mapped.isDefault = account.isDefault;
        }
        return mapped;
      })
      .filter((account) => Object.keys(account).length > 0);
  }

  private buildEditableUsers(data: CompanyEntity): EditableCompanyUser[] {
    const source = (data as { users?: CompanyUserSource[] }).users ?? [];
    const list = Array.isArray(source) ? source : [];
    return list
      .map((user) => {
        const mapped: EditableCompanyUser = {};
        if (user.id !== undefined) {
          mapped.id = user.id;
        }
        if (user.name !== undefined) {
          mapped.name = user.name;
        }
        if (user.email !== undefined) {
          mapped.email = user.email;
        }
        if (user.status !== undefined) {
          mapped.status = user.status;
        }
        const derivedRoleId = user.roleId !== undefined ? user.roleId : user.role?.id;
        if (derivedRoleId !== undefined) {
          mapped.roleId = derivedRoleId;
        }
        return mapped;
      })
      .filter((user) => Object.keys(user).length > 0);
  }

  private pickFromSource<T extends object, K extends keyof T>(
    source: T | null,
    fields: readonly K[]
  ): Partial<Pick<T, K>> | null {
    if (!source) {
      return null;
    }
    const picked: Partial<Pick<T, K>> = {};
    let hasValue = false;
    fields.forEach((field) => {
      const value = source[field];
      if (value !== undefined) {
        picked[field] = value;
        hasValue = true;
      }
    });
    return hasValue ? picked : null;
  }

  private computeDiff(
    updated: UpdateCompanyPayload,
    original: UpdateCompanyPayload
  ): UpdateCompanyPayload {
    const diff: UpdateCompanyPayload = {};

    if (!this.valuesMatch(updated.legalName, original.legalName)) {
      diff.legalName = updated.legalName;
    }
    if (!this.valuesMatch(updated.tradeName, original.tradeName)) {
      diff.tradeName = updated.tradeName;
    }
    if (!this.valuesMatch(updated.companyCode, original.companyCode)) {
      diff.companyCode = updated.companyCode;
    }
    if (!this.valuesMatch(updated.country, original.country)) {
      diff.country = updated.country;
    }
    if (!this.valuesMatch(updated.baseCurrency, original.baseCurrency)) {
      diff.baseCurrency = updated.baseCurrency;
    }
    if (!this.valuesMatch(updated.timeZone, original.timeZone)) {
      diff.timeZone = updated.timeZone;
    }

    const addressDiff = this.diffObjects<CompanyAddressInput>(
      updated.address ?? null,
      original.address ?? null
    );
    if (addressDiff) {
      diff.address = addressDiff;
    }

    const financialDiff = this.diffObjects<FinancialSettingsInput>(
      updated.financial ?? null,
      original.financial ?? null
    );
    if (financialDiff) {
      diff.financial = financialDiff;
    }

    const paymentDiff = this.diffObjects<PaymentSettingsInput>(
      updated.payment ?? null,
      original.payment ?? null
    );
    if (paymentDiff) {
      diff.payment = paymentDiff;
    }

    const newBankAccounts = updated.bankAccounts ?? [];
    const oldBankAccounts = original.bankAccounts ?? [];
    if (!this.arraysEqual(newBankAccounts, oldBankAccounts)) {
      diff.bankAccounts = newBankAccounts;
    }

    const newUsers = updated.users ?? [];
    const oldUsers = original.users ?? [];
    if (!this.arraysEqual(newUsers, oldUsers)) {
      diff.users = newUsers;
    }

    return diff;
  }

  private diffObjects<T extends object>(
    newObj: Partial<T> | null,
    oldObj: Partial<T> | null
  ): Partial<T> | null {
    if (!newObj) {
      return null;
    }
    const diff: Partial<T> = {};
    let hasChanges = false;
    (Object.keys(newObj) as (keyof T)[]).forEach((key) => {
      const newValue = newObj[key];
      const oldValue = oldObj?.[key];
      if (!this.valuesMatch(newValue, oldValue)) {
        diff[key] = newValue;
        hasChanges = true;
      }
    });
    return hasChanges ? diff : null;
  }

  private arraysEqual<T>(a: T[] | undefined, b: T[] | undefined): boolean {
    const aStr = JSON.stringify(a ?? []);
    const bStr = JSON.stringify(b ?? []);
    return aStr === bStr;
  }

  private valuesMatch<T>(a: T | undefined, b: T | undefined): boolean {
    return a === b;
  }
}
