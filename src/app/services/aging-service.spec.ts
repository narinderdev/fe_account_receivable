import { TestBed } from '@angular/core/testing';

import { AgingService } from './aging-service';

describe('AgingService', () => {
  let service: AgingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
