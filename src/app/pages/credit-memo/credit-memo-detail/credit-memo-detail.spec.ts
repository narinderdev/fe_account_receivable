import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditMemoDetail } from './credit-memo-detail';

describe('CreditMemoDetail', () => {
  let component: CreditMemoDetail;
  let fixture: ComponentFixture<CreditMemoDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditMemoDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreditMemoDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
