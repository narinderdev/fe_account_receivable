import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoicesReports } from './invoices-reports';

describe('InvoicesReports', () => {
  let component: InvoicesReports;
  let fixture: ComponentFixture<InvoicesReports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoicesReports]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoicesReports);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
