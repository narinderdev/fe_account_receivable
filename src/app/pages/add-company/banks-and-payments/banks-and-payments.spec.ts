import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BanksAndPayments } from './banks-and-payments';

describe('BanksAndPayments', () => {
  let component: BanksAndPayments;
  let fixture: ComponentFixture<BanksAndPayments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BanksAndPayments]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BanksAndPayments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
