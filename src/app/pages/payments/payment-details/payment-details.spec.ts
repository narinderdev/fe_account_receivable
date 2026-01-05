import { ActivatedRoute } from '@angular/router';

import { PaymentDetails } from './payment-details';

describe('PaymentDetails', () => {
  const createComponent = () => {
    const route = {
      snapshot: { paramMap: { get: () => '15' } },
    } as unknown as ActivatedRoute;
    return new PaymentDetails(route);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('initialisation', () => {
    it('hydrates payment details from local storage', () => {
      localStorage.setItem(
        'paymentsData',
        JSON.stringify([
          {
            id: 15,
            paymentDate: '2024-01-01',
            paymentAmount: 100,
            notes: '  Hello  ',
            applications: [{ invoice: { customer: { customerName: 'Acme' } } }],
          },
        ])
      );
      const instance = createComponent();
      instance.ngOnInit();
      expect(instance.customerName).toBe('Acme');
      expect(instance.notes).toBe('Hello');
    });
  });
});
