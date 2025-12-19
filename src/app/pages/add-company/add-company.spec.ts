import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCompany } from './add-company';

describe('AddCompany', () => {
  let component: AddCompany;
  let fixture: ComponentFixture<AddCompany>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCompany]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddCompany);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
