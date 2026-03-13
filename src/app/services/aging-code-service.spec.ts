import { TestBed } from '@angular/core/testing';

import { AgingCodeService } from './aging-code-service';

describe('AgingCodeService', () => {
  let service: AgingCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgingCodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
