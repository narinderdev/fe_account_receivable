import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyAddress } from './company-address';

describe('CompanyAddress', () => {
  let component: CompanyAddress;
  let fixture: ComponentFixture<CompanyAddress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyAddress]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyAddress);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
