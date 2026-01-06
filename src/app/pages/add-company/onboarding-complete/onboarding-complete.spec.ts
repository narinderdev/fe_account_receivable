import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { OnboardingComplete } from './onboarding-complete';
import { CompanyService } from '../../../services/company-service';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';
import { CompanyResponse } from '../../../models/company.model';

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

    return { instance: new OnboardingComplete(router, route, companyService), companyService };
  };

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
});
