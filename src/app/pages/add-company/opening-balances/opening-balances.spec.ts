import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpeningBalances } from './opening-balances';

describe('OpeningBalances', () => {
  let component: OpeningBalances;
  let fixture: ComponentFixture<OpeningBalances>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpeningBalances]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpeningBalances);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
