import { TestBed } from '@angular/core/testing';

import { PaymentReportService } from './payment-report-service';

describe('PaymentReportService', () => {
  let service: PaymentReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
