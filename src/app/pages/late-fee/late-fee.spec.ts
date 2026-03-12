import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LateFee } from './late-fee';

describe('LateFee', () => {
  let component: LateFee;
  let fixture: ComponentFixture<LateFee>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LateFee]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LateFee);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
