import { TestBed } from '@angular/core/testing';

import { MonthEndService } from './month-end-service';

describe('MonthEndService', () => {
  let service: MonthEndService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MonthEndService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
