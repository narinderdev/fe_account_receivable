import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { OnboardingComplete } from './onboarding-complete';
import { CompanyService } from '../../../services/company-service';

describe('OnboardingComplete', () => {
  let component: OnboardingComplete;
  let fixture: ComponentFixture<OnboardingComplete>;

  beforeEach(async () => {
    const companyServiceMock = {
      getChangedCompanyPayload: jasmine.createSpy('getChangedCompanyPayload').and.returnValue({}),
      updateCompany: jasmine.createSpy('updateCompany').and.returnValue(of({})),
      setEditingCompany: jasmine.createSpy('setEditingCompany'),
      setOriginalCompany: jasmine.createSpy('setOriginalCompany'),
      getEditingCompanySnapshot: jasmine.createSpy('getEditingCompanySnapshot').and.returnValue(null),
      getOriginalCompanySnapshot: jasmine.createSpy('getOriginalCompanySnapshot').and.returnValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [OnboardingComplete],
      providers: [
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { params: {} } },
            snapshot: { params: {} },
          },
        },
        { provide: CompanyService, useValue: companyServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingComplete);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
