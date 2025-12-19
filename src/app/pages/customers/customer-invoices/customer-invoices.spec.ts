import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerInvoices } from './customer-invoices';

describe('CustomerInvoices', () => {
  let component: CustomerInvoices;
  let fixture: ComponentFixture<CustomerInvoices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerInvoices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerInvoices);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
