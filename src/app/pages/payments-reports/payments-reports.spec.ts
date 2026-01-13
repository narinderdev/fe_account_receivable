import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentsReports } from './payments-reports';

describe('PaymentsReports', () => {
  let component: PaymentsReports;
  let fixture: ComponentFixture<PaymentsReports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsReports]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentsReports);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
