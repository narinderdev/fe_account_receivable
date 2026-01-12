import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WriteOff } from './write-off';

describe('WriteOff', () => {
  let component: WriteOff;
  let fixture: ComponentFixture<WriteOff>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WriteOff]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WriteOff);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
