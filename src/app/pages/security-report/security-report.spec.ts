import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecurityReport } from './security-report';

describe('SecurityReport', () => {
  let component: SecurityReport;
  let fixture: ComponentFixture<SecurityReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecurityReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
