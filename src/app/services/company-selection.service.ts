import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CompanySelectionService {
  private readonly storageKey = 'selectedCompanyId';
  private selectedCompanyIdSubject = new BehaviorSubject<string | null>(
    this.getInitialSelection()
  );
  selectedCompanyId$ = this.selectedCompanyIdSubject.asObservable();

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  private getInitialSelection(): string | null {
    if (!this.hasStorage()) {
      return null;
    }
    return localStorage.getItem(this.storageKey);
  }

  setSelectedCompanyId(id: string | null) {
    if (this.hasStorage()) {
      if (id) {
        localStorage.setItem(this.storageKey, id);
      } else {
        localStorage.removeItem(this.storageKey);
      }
    }
    this.selectedCompanyIdSubject.next(id);
  }

  getSelectedCompanyId(): string | null {
    return this.selectedCompanyIdSubject.value;
  }
}
