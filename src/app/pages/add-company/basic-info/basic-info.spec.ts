import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CompanyService } from '../../../services/company-service';

import { BasicInfo } from './basic-info';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('BasicInfo', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'createCompany',
      'setEditingCompany',
    ]);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const route = { parent: { snapshot: { params: {} } }, snapshot: { params: {} } } as ActivatedRoute;
    const instance = new BasicInfo(fb, companyService, router, route);
    instance.basicForm = fb.group({
      legalName: ['Acme'],
      tradeName: ['Acme'],
      companyCode: ['AC'],
      country: ['USA'],
      baseCurrency: ['USD'],
      timeZone: ['UTC'],
    });
    instance.companyData = {
      id: 1,
    } as any;
    return { instance, companyService };
  };

  it('should create', () => {
    const { instance } = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('helpers', () => {
    it('gracefully handles invalid cached JSON', () => {
      const { instance } = createComponent();
      expect((instance as any).parseCompany('not-json')).toBeNull();
      const parsed = (instance as any).parseCompany('{"id":5}');
      expect(parsed?.id).toBe(5);
    });

    it('persists edit changes into the company service', () => {
      const { instance, companyService } = createComponent();
      instance.isEditMode = true;
      (instance as any).persistEditChanges(true);
      expect(companyService.setEditingCompany).toHaveBeenCalled();
    });
  });
});