import { TestBed } from '@angular/core/testing';

import { LateFeeService } from './late-fee-service';

describe('LateFeeService', () => {
  let service: LateFeeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LateFeeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
