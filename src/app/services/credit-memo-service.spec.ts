import { TestBed } from '@angular/core/testing';

import { CreditMemoService } from './credit-memo-service';

describe('CreditMemoService', () => {
  let service: CreditMemoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreditMemoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
