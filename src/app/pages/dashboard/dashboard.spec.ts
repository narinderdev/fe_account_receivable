import { ChangeDetectorRef } from '@angular/core';
import { of, Subject } from 'rxjs';
import { Dashboard } from './dashboard';
import { DashboardService } from '../../services/dashboard-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { DashboardGraphResponse, DashboardSummaryResponse } from '../../models/dashboard.model';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('Dashboard', () => {
  const createComponent = () => {
    const dashboardService = createSpyObj<DashboardService>('DashboardService', [
      'getDashboardCardData',
      'getDashboardGraphData',
    ]);
    dashboardService.getDashboardCardData.mockReturnValue(of({} as DashboardSummaryResponse));
    dashboardService.getDashboardGraphData.mockReturnValue(of({} as DashboardGraphResponse));

    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    };

    return new Dashboard(
      'browser' as unknown as object,
      dashboardService,
      cdr,
      companySelection as unknown as CompanySelectionService
    );
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('logic helpers', () => {
    it('formats months in a human readable way', () => {
      const instance = createComponent();
      expect(instance.formatMonth('2025-01')).toBe('Jan 2025');
      expect(instance.formatMonth('2024-12')).toBe('Dec 2024');
    });

    it('calculates a suggested max that is 20% higher than the max value', () => {
      const instance = createComponent();
      expect(instance.calculateSuggestedMax([10, 20])).toBe(24);
      expect(instance.calculateSuggestedMax([0, 0])).toBe(100);
    });

    it('builds 12 labels for the last 12 months', () => {
      const instance = createComponent();
      const months = instance.generateLast12Months();
      expect(months.length).toBe(12);
      expect(months.every((label) => label.includes(' '))).toBe(true);
    });
  });
});
