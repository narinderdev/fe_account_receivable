import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentService } from '../../services/payment-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';

import { Payments } from './payments';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

interface TestPayment {
  id: number;
  type: 'MANUAL' | 'BANK';
  customerName: string;
  amount: number;
  status?: string;
  description?: string;
  source?: string;
  date?: string;
}

describe('Payments', () => {
  const createComponent = () => {
    const paymentService = createSpyObj<PaymentService>('PaymentService', [
      'getPayments',
      'getManualPayments',
    ]);
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
    it('returns friendly status labels and initials', () => {
      const instance = createComponent();
      const payment = createPayment({
        status: 'PARTIAL',
        customerName: 'Acme Corp',
      });
      expect(instance.getStatusLabel(payment)).toBe('Partial');
      expect(instance.getCustomerInitial(payment)).toBe('A');
    });
  });
});

function createPayment(overrides: Partial<TestPayment> = {}): TestPayment {
  return {
    id: 1,
    type: 'BANK',
    date: '2024-01-01',
    amount: 100,
    customerName: 'Default Customer',
    description: 'ACH Credit',
    source: 'BANK',
    status: 'DRAFT',
    ...overrides,
  };
}
