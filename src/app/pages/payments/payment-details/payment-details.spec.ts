import { ActivatedRoute } from '@angular/router';

import { PaymentDetails } from './payment-details';

describe('PaymentDetails', () => {
  afterEach(() => localStorage.removeItem('paymentsData'));

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
            type: 'MANUAL',
            manualPayment: {
              id: 15,
              bankDeposit: 50,
              serviceFee: 10,
              paymentAmount: 5000,
              paymentMethod: 'ACH',
              paymentDate: '2026-02-04',
              notes: '  ACH Credit  ',
              customer: {
                id: 1,
                customerId: 1,
                customerName: 'Vendor 1',
                customerType: 'Business',
                email: 'vendor@example.com',
                phoneNumber: null,
                deleted: false,
                address: null,
                cashApplication: null,
                dunning: null,
                eft: null,
                statement: null,
                vat: null,
              },
              applications: [
                {
                  id: 1,
                  appliedAmount: 100,
                  openAmount: 0,
                  invoice: {
                    id: 1,
                    invoiceNumber: 'INV-1',
                    invoiceDate: '2026-01-01',
                    dueDate: '2026-02-01',
                    subTotal: 100,
                    totalAmount: 100,
                    balanceDue: 0,
                    status: 'PARTIAL',
                    lastPaymentDate: '2026-02-04',
                    note: null,
                    generated: true,
                    active: true,
                    deleted: false,
                    customer: {
                      id: 1,
                      customerId: 1,
                      customerName: 'Vendor 1',
                      customerType: 'Business',
                      email: 'vendor@example.com',
                      phoneNumber: null,
                      deleted: false,
                      address: null,
                      cashApplication: null,
                      dunning: null,
                      eft: null,
                      statement: null,
                      vat: null,
                    },
                  },
                },
              ],
            },
          },
        ]),
      );
      const instance = createComponent();
      instance.ngOnInit();
      expect(instance.customerName).toBe('Vendor 1');
      expect(instance.paymentAmount).toBe(5000);
      expect(instance.notes).toBe('ACH Credit');
      expect(instance.bankDeposit).toBe(50);
      expect(instance.isManual).toBe(true);
    });
  });
});
