import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReceivePayment } from './receive-payment';

describe('ReceivePayment', () => {
  let component: ReceivePayment;
  let fixture: ComponentFixture<ReceivePayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceivePayment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReceivePayment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
