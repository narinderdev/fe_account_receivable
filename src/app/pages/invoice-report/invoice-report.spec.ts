import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceReport } from './invoice-report';

describe('InvoiceReport', () => {
  let component: InvoiceReport;
  let fixture: ComponentFixture<InvoiceReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
