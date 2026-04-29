import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { Main } from './main';

describe('Main', () => {
  let component: Main;
  let fixture: ComponentFixture<Main>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Main, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Main);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows sidebar and navbar on onboarding complete after company setup', () => {
    localStorage.setItem('hasCompanies', 'true');

    const updateVisibility = (
      component as unknown as { updateSidebarVisibility(url: string): void }
    ).updateSidebarVisibility;

    updateVisibility.call(component, '/admin/ar-company/onboarding-complete');

    expect(component.hideSidebar).toBe(false);
    expect(component.showNavbar).toBe(true);
    expect(component.showSignoutBar).toBe(false);
  });
});
