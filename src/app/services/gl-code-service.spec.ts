import { TestBed } from '@angular/core/testing';

import { GlCodeService } from './gl-code-service';

describe('GlCodeService', () => {
  let service: GlCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlCodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
