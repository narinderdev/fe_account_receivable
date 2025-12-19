import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancialArSettings } from './financial-ar-settings';

describe('FinancialArSettings', () => {
  let component: FinancialArSettings;
  let fixture: ComponentFixture<FinancialArSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialArSettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinancialArSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
