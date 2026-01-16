import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { OnboardingComplete } from './onboarding-complete';
import { CompanyService } from '../../../services/company-service';
import { createSpyObj } from 'src/testing/spy-helpers';
import { CompanyResponse } from '../../../models/company.model';
import { CompanySelectionService } from '../../../services/company-selection.service';

describe('OnboardingComplete', () => {
  const createComponent = () => {
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'getChangedCompanyPayload',
      'updateCompany',
      'setEditingCompany',
      'setOriginalCompany',
      'getEditingCompanySnapshot',
      'getOriginalCompanySnapshot',
    ]);
    companyService.getChangedCompanyPayload.mockReturnValue({});
    companyService.updateCompany.mockReturnValue(of({} as CompanyResponse));
    companyService.getEditingCompanySnapshot.mockReturnValue(null);
    companyService.getOriginalCompanySnapshot.mockReturnValue(null);

    const router = createSpyObj<Router>('Router', ['navigate']);
    const route = {
      parent: { snapshot: { params: {} } },
      snapshot: { params: {} },
    } as ActivatedRoute;

    const companySelection = createSpyObj<CompanySelectionService>('CompanySelectionService', [
      'setSelectedCompanyId',
      'getSelectedCompanyId',
    ]);
    companySelection.getSelectedCompanyId.mockReturnValue(null);

    return {
      instance: new OnboardingComplete(router, route, companyService, companySelection),
      companyService,
      companySelection,
      router,
    };
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    const { instance } = createComponent();
    expect(instance).toBeTruthy();
  });

  it('shows info message when there are no pending changes', () => {
    const { instance, companyService } = createComponent();
    companyService.getChangedCompanyPayload.mockReturnValue({});
    instance.isEditMode = true;
    (instance as unknown as { companyId: number | null }).companyId = 5;
    instance.submitUpdates();
    expect(instance.infoMessage).toContain('No changes detected');
    expect(companyService.updateCompany).not.toHaveBeenCalled();
  });

  it('invokes update when payload exists', () => {
    const { instance, companyService } = createComponent();
    companyService.getChangedCompanyPayload.mockReturnValue({ legalName: 'Updated' });
    instance.isEditMode = true;
    (instance as unknown as { companyId: number | null }).companyId = 3;
    instance.submitUpdates();
    expect(companyService.updateCompany).toHaveBeenCalledWith(3, { legalName: 'Updated' });
  });

  it('skips updates when edit mode is disabled or id missing', () => {
    const { instance, companyService } = createComponent();
    instance.isEditMode = false;
    (instance as unknown as { companyId: number | null }).companyId = 4;
    instance.submitUpdates();
    expect(companyService.updateCompany).not.toHaveBeenCalled();

    instance.isEditMode = true;
    (instance as unknown as { companyId: number | null }).companyId = null;
    instance.submitUpdates();
    expect(companyService.updateCompany).not.toHaveBeenCalled();
  });

  it('surfaces an error message when update fails', () => {
    const { instance, companyService } = createComponent();
    instance.isEditMode = true;
    (instance as unknown as { companyId: number | null }).companyId = 8;
    companyService.getChangedCompanyPayload.mockReturnValue({ legalName: 'Updated' });
    companyService.updateCompany.mockReturnValue(throwError(() => new Error('fail')));
    instance.submitUpdates();
    expect(instance.errorMessage).toContain('Failed to update company');
  });

  it('hydrates cached state from localStorage when missing snapshots', () => {
    const { instance, companyService } = createComponent();
    localStorage.setItem('editingCompany', JSON.stringify({ id: 9 }));
    localStorage.setItem('originalCompany', JSON.stringify({ id: 9 }));
    (instance as unknown as { companyId: number | null }).companyId = 9;
    const hydrate = (instance as unknown as { hydrateCachedState(): void }).hydrateCachedState;
    hydrate.call(instance);
    expect(companyService.setEditingCompany).toHaveBeenCalledWith({ id: 9 });
    expect(companyService.setOriginalCompany).toHaveBeenCalledWith({ id: 9 });
  });

  it('marks company availability and selection', () => {
    const { instance, companySelection } = createComponent();
    const mark = (instance as unknown as { markCompanyAvailability(): void }).markCompanyAvailability;
    (instance as unknown as { companyId: number | null }).companyId = 10;
    instance.isEditMode = true;
    companySelection.getSelectedCompanyId.mockReturnValue(null);
    mark.call(instance);
    expect(localStorage.getItem('hasCompanies')).toBe('true');
    expect(companySelection.setSelectedCompanyId).toHaveBeenCalledWith('10');
  });
});
