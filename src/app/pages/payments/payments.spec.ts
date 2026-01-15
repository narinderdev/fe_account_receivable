import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentService } from '../../services/payment-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';

import { Payments } from './payments';
import { Payment, PaymentApplication } from '../../models/payment.model';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('Payments', () => {
  const createComponent = () => {
    const paymentService = createSpyObj<PaymentService>('PaymentService', ['getPayments']);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    const userContext = createSpyObj<UserContextService>('UserContextService', ['hasPermission']);
    userContext.hasPermission.mockReturnValue(true);
    return new Payments(paymentService, router, cdr, companySelection, userContext);
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('helper behaviour', () => {
    it('totals applied amounts for a payment', () => {
      const instance = createComponent();
      const payment = createPayment({
        applications: [createApplication({ appliedAmount: 10 }), createApplication({ appliedAmount: 15 })],
      });
      expect(instance.getAppliedAmount(payment)).toBe(25);
    });

    it('returns friendly invoice statuses and initials', () => {
      const instance = createComponent();
      const payment = createPayment({
        applications: [
          createApplication({
            invoice: {
              ...createApplication().invoice,
              status: 'PARTIAL',
              customer: { ...createApplication().invoice.customer, customerName: 'Acme Corp' },
            },
          }),
        ],
      });
      expect(instance.getInvoiceStatus(payment)).toBe('Partial');
      expect(instance.getCustomerInitial(payment)).toBe('A');
    });
  });
});

function createPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    bankDeposit: 0,
    serviceFee: 0,
    paymentAmount: 100,
    paymentMethod: 'CARD',
    paymentDate: '2024-01-01',
    notes: '',
    customer: {
      id: 1,
      customerId: 1,
      customerName: 'Default Customer',
      customerType: 'Business',
      email: 'customer@example.com',
      deleted: false,
      address: null,
      cashApplication: null,
      dunning: null,
      eft: null,
      statement: null,
      vat: null,
    },
    applications: [],
    ...overrides,
  };
}

function createApplication(overrides: Partial<PaymentApplication> = {}): PaymentApplication {
  const base = {
    id: 1,
    appliedAmount: 0,
    invoice: {
      id: 1,
      invoiceNumber: 'INV-1',
      invoiceDate: '2024-01-01',
      dueDate: '2024-01-31',
      subTotal: 100,
      totalAmount: 110,
      balanceDue: 50,
      status: 'OPEN' as const,
      lastPaymentDate: null,
      note: null,
      generated: false,
      active: true,
      deleted: false,
      customer: {
        id: 1,
        customerId: 1,
        customerName: 'Default Customer',
        customerType: 'Business',
        email: 'customer@example.com',
        deleted: false,
        address: null,
        cashApplication: null,
        dunning: null,
        eft: null,
        statement: null,
        vat: null,
      },
    },
  };

  return { ...base, ...overrides };
}
