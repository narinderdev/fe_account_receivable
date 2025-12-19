import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateInvoice } from './create-invoice';

describe('CreateInvoice', () => {
  let component: CreateInvoice;
  let fixture: ComponentFixture<CreateInvoice>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateInvoice]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateInvoice);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
