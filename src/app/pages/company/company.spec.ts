import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyService } from '../../services/company-service';
import { UserContextService } from '../../services/user-context.service';

import { Company } from './company';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('Company', () => {
  const createComponent = () => {
    const companyService = createSpyObj<CompanyService>('CompanyService', ['getCompany', 'deleteCompany']);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const userContext = createSpyObj<UserContextService>('UserContextService', ['hasPermission']);
    userContext.hasPermission.mockReturnValue(true);
    return new Company(companyService, router, cdr, userContext);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('helpers', () => {
    it('generates sequential page numbers when there are fewer than 7 pages', () => {
      const instance = createComponent();
      instance.totalPages = 4;
      instance.currentPage = 1;
      expect(instance.getPageNumbers()).toEqual([1, 2, 3, 4]);
    });

    it('returns deterministic colors for avatar initials', () => {
      const instance = createComponent();
      expect(instance.getInitialColor(0)).toEqual({ background: '#DBEAFE', color: '#2563EB' });
      expect(instance.getInitialColor(5)).toEqual({ background: '#CCFBF1', color: '#0D9488' });
    });
  });
});