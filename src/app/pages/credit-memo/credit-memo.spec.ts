import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditMemo } from './credit-memo';

describe('CreditMemo', () => {
  let component: CreditMemo;
  let fixture: ComponentFixture<CreditMemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditMemo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreditMemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
