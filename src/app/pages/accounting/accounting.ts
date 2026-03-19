import { CommonModule, CurrencyPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';
import { MonthEndService } from '../../services/month-end-service';
import {
  PeriodManagementPayload,
  PeriodMonthStatus,
  PeriodYearStatus,
} from '../../models/accounting.model';
import { CompanySelectionService } from '../../services/company-selection.service';

export type MonthClosingStatus = {
  month: string;
  year: number;
  status: 'CLOSED' | 'OPEN';
  snapshotBalance: number | null;
};

export type YearClosingStatus = {
  year: number;
  status: 'CLOSED' | 'OPEN';
  yearEndAr: number | null;
  estimatedClosingAr?: number | null;
};

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, NgClass, CurrencyPipe],
  templateUrl: './accounting.html',
  styleUrls: ['./accounting.css'],
})
export class Accounting implements OnInit, OnDestroy {
  readonly breadcrumbLabel = 'Accounting / Period Close';
  readonly headline = 'Period Management';
  financialYear = new Date().getFullYear();
  readonly checklist = [
    { label: 'Lock all transactions dated in', appendYear: true },
    { label: 'Prevent editing invoices/payments in', appendYear: true },
    { label: 'Finalize Accounts Receivable balance', appendYear: false },
  ];

  monthStatuses: MonthClosingStatus[] = [];
  yearStatuses: YearClosingStatus[] = [];

  closeYearModalOpen = false;
  pendingYear: YearClosingStatus | null = null;
  isLoading = false;
  loadError = '';
  private readonly monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'June',
    'July',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec',
  ];
  private readonly monthEndService = inject(MonthEndService);
  private readonly companySelection = inject(CompanySelectionService);
  private selectedCompanyId: number | null = null;
  private readonly cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((companyId) => {
        const parsed = this.parseNumeric(companyId);
        if (!parsed) {
          this.selectedCompanyId = null;
          this.monthStatuses = [];
          this.yearStatuses = [];
          this.loadError = 'Please select or create a company to view period data.';
          return;
        }

        const numericId = parsed;
        const hasChanged = this.selectedCompanyId !== numericId;
        this.selectedCompanyId = numericId;
        if (hasChanged || !this.monthStatuses.length) {
          this.fetchPeriodSummary();
        }
      });

    const currentSelection = this.companySelection.getSelectedCompanyId();
    if (!currentSelection) {
      this.loadError = 'Please select or create a company to view period data.';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchPeriodSummary() {
    if (!this.selectedCompanyId) {
      return;
    }

    this.isLoading = true;
    this.loadError = '';

    this.monthEndService
      .getCompanyYearSummary(this.selectedCompanyId, this.financialYear)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => this.handlePeriodPayload(response?.data ?? null),
        error: (error) => {
          console.error('Failed to load period summary', error);
          this.monthStatuses = [];
          this.yearStatuses = [];
          this.loadError = 'Unable to load period data right now. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  private handlePeriodPayload(payload: PeriodManagementPayload | PeriodManagementPayload[] | null) {
    if (!payload || Array.isArray(payload)) {
      this.monthStatuses = [];
      this.yearStatuses = [];
      this.loadError = '';
      this.cdr.detectChanges();
      return;
    }

    if (typeof payload.financialYear === 'number' && payload.financialYear > 0) {
      this.financialYear = payload.financialYear;
    }

    const normalizedMonths = this.normalizeMonthStatuses(payload.monthEndStatuses);
    const normalizedYears = this.normalizeYearStatuses(payload.yearEndStatuses);

    this.monthStatuses = normalizedMonths;
    this.yearStatuses = normalizedYears;

    this.loadError = normalizedMonths.length ? '' : 'No period data found for the selected year.';
    this.cdr.detectChanges();
  }

  private normalizeMonthStatuses(source?: PeriodMonthStatus[] | null): MonthClosingStatus[] {
    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((entry) => {
        const label = this.resolveMonthLabel(entry);
        const parsedYear = this.parseNumeric(entry.year) ?? this.financialYear;
        const status = this.resolveStatus(entry.status);
        const snapshot = this.parseNumeric(entry.snapshotBalance ?? entry.amount);

        if (!label) {
          return null;
        }

        return {
          month: label,
          year: parsedYear,
          status,
          snapshotBalance: snapshot ?? null,
        };
      })
      .filter((entry): entry is MonthClosingStatus => entry !== null);
  }

  private normalizeYearStatuses(source?: PeriodYearStatus[] | null): YearClosingStatus[] {
    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((entry) => {
        const parsedYear = this.parseNumeric(entry.year) ?? this.financialYear;
        const status = this.resolveStatus(entry.status);
        const yearEndAr = this.parseNumeric(entry.yearEndAr);
        const estimatedClosingAr = this.parseNumeric(entry.estimatedClosingAr);

        return {
          year: parsedYear,
          status,
          yearEndAr,
          estimatedClosingAr,
        };
      })
      .filter((entry) => typeof entry.year === 'number' && !Number.isNaN(entry.year));
  }

  private resolveStatus(value: string | null | undefined): 'CLOSED' | 'OPEN' {
    return value?.toUpperCase() === 'CLOSED' ? 'CLOSED' : 'OPEN';
  }

  private resolveMonthLabel(entry: PeriodMonthStatus): string {
    const candidate = entry.month ?? entry.monthName ?? entry.label;

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (!trimmed) {
        return '';
      }

      if (/^\d{4}-\d{2}$/.test(trimmed)) {
        const [_year, month] = trimmed.split('-');
        const index = Number(month) - 1;
        const name = this.monthNames[index] ?? month;
        return `${name}`;
      }

      if (/^\d{1,2}$/.test(trimmed)) {
        const index = Number(trimmed) - 1;
        return this.monthNames[index] ?? trimmed;
      }

      return trimmed;
    }

    if (typeof candidate === 'number') {
      return this.monthNames[Math.max(0, candidate - 1)] ?? `M${candidate}`;
    }

    return '';
  }

  private parseNumeric(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (!normalized) {
        return null;
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  openCloseYearModal(yearStatus: YearClosingStatus) {
    if (yearStatus.status === 'CLOSED') {
      return;
    }

    this.pendingYear = { ...yearStatus };
    this.closeYearModalOpen = true;
  }

  closeModal() {
    this.pendingYear = null;
    this.closeYearModalOpen = false;
  }

  confirmYearClose() {
    if (!this.pendingYear) {
      return;
    }

    this.yearStatuses = this.yearStatuses.map((year) => {
      if (year.year === this.pendingYear?.year) {
        return {
          ...year,
          status: 'CLOSED',
          yearEndAr: year.yearEndAr ?? year.estimatedClosingAr ?? 0,
        };
      }
      return year;
    });

    this.closeModal();
  }

  getYearEndValue(year: YearClosingStatus): number | null {
    return year.yearEndAr ?? year.estimatedClosingAr ?? null;
  }
}
