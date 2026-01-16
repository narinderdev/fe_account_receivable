import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentReport } from './payment-report';

describe('PaymentReport', () => {
  let component: PaymentReport;
  let fixture: ComponentFixture<PaymentReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
