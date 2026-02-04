import { Router, ActivatedRoute } from '@angular/router';
import { CompanyService } from '../../services/company-service';

import { AddCompany } from './add-company';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('AddCompany', () => {
  const createComponent = () => {
    const router = createSpyObj<Router>('Router', ['navigate']);
    const route = { snapshot: { params: {}, firstChild: null } } as ActivatedRoute;
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'setEditingCompany',
      'setOriginalCompany',
      'getCompanyById',
    ]);
    return { instance: new AddCompany(router, route, companyService), router };
  };

  it('should create', () => {
    const { instance } = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('navigation rules', () => {
    it('does not navigate to locked steps in add mode', () => {
      const { instance, router } = createComponent();
      instance.currentStep = 'step-1';
      instance.isEditMode = false;
      instance.goTo('step-2');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('navigates to edit routes when unlocked in edit mode', () => {
      const { instance, router } = createComponent();
      instance.isEditMode = true;
      instance.companyId = 12;
      instance.goTo('step-3');
      expect(router.navigate).toHaveBeenCalledWith(['/admin/ar-company/edit/12/step-3']);
    });
  });
});