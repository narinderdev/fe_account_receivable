import { TestBed } from '@angular/core/testing';

import { ArCodeService } from './ar-code-service';

describe('ArCodeService', () => {
  let service: ArCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ArCodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
