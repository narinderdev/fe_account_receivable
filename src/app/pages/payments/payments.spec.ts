import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentService } from '../../services/payment-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';

import { Payments } from './payments';
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
      const payment = {
        applications: [{ appliedAmount: 10 }, { appliedAmount: 15 }],
      } as any;
      expect(instance.getAppliedAmount(payment)).toBe(25);
    });

    it('returns friendly invoice statuses and initials', () => {
      const instance = createComponent();
      const payment = {
        applications: [{ invoice: { status: 'PARTIAL', customer: { customerName: 'Acme Corp' } } }],
      } as any;
      expect(instance.getInvoiceStatus(payment)).toBe('Partial');
      expect(instance.getCustomerInitial(payment)).toBe('A');
    });
  });
});