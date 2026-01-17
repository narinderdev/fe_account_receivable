import { TestBed } from '@angular/core/testing';

import { InvoiceReportService } from './invoice-report-service';

describe('InvoiceReportService', () => {
  let service: InvoiceReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InvoiceReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
