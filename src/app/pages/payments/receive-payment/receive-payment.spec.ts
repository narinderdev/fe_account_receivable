import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Customer } from '../../../services/customer';
import { ToastrService } from 'ngx-toastr';
import { PaymentService } from '../../../services/payment-service';
import { CompanySelectionService } from '../../../services/company-selection.service';
import { Subject } from 'rxjs';

import { ReceivePayment } from './receive-payment';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('ReceivePayment', () => {
  const createComponent = () => {
    const customerService = createSpyObj<Customer>('Customer', ['getCustomers']);
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const paymentService = createSpyObj<PaymentService>('PaymentService', ['applyPayment']);
    const router = createSpyObj<Router>('Router', ['navigate']);
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    return new ReceivePayment(
      customerService,
      cdr,
      toastr,
      paymentService,
      router,
      companySelection,
    );
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('form logic', () => {
    it('validates required fields before applying payment', () => {
      const instance = createComponent();
      instance.selectedCustomerId = null;
      instance.bankDeposit = null;
      instance.serviceFee = null;
      instance.paymentMethod = '';
      instance.notes = '   ';

      expect(instance.isFormValid()).toBe(false);
      expect(instance.showCustomerError).toBe(true);
      expect(instance.showBankDepositError).toBe(true);
      expect(instance.showServiceFeeError).toBe(false); // Service fee is optional
      expect(instance.showPaymentMethodError).toBe(true);
      expect(instance.showNotesError).toBe(true);
    });

    it('validates form as valid when all required fields are provided', () => {
      const instance = createComponent();
      instance.selectedCustomerId = 1;
      instance.bankDeposit = 100;
      instance.serviceFee = null;
      instance.paymentMethod = 'CASH';
      instance.notes = 'Test payment';

      expect(instance.isFormValid()).toBe(true);
      expect(instance.showCustomerError).toBe(false);
      expect(instance.showBankDepositError).toBe(false);
      expect(instance.showServiceFeeError).toBe(false);
      expect(instance.showPaymentMethodError).toBe(false);
      expect(instance.showNotesError).toBe(false);
    });

    it('validates service fee only if provided and ensures non-negative', () => {
      const instance = createComponent();

      // Service fee is null - should be valid
      instance.serviceFee = null;
      instance.selectedCustomerId = 1;
      instance.bankDeposit = 100;
      instance.paymentMethod = 'CASH';
      instance.notes = 'Test';
      expect(instance.isFormValid()).toBe(true);
      expect(instance.showServiceFeeError).toBe(false);

      // Service fee is negative - should be invalid
      instance.serviceFee = -10;
      expect(instance.isFormValid()).toBe(false);
      expect(instance.showServiceFeeError).toBe(true);

      // Service fee is 0 - should be valid
      instance.serviceFee = 0;
      expect(instance.isFormValid()).toBe(true);
      expect(instance.showServiceFeeError).toBe(false);

      // Service fee is positive - should be valid
      instance.serviceFee = 25;
      expect(instance.isFormValid()).toBe(true);
      expect(instance.showServiceFeeError).toBe(false);
    });

    it('validates bank deposit as required and non-negative', () => {
      const instance = createComponent();
      instance.selectedCustomerId = 1;
      instance.paymentMethod = 'CASH';
      instance.notes = 'Test';

      // Bank deposit is null - should be invalid
      instance.bankDeposit = null;
      expect(instance.isFormValid()).toBe(false);
      expect(instance.showBankDepositError).toBe(true);

      // Bank deposit is negative - should be invalid
      instance.bankDeposit = -10;
      expect(instance.isFormValid()).toBe(false);
      expect(instance.showBankDepositError).toBe(true);

      // Bank deposit is 0 - should be valid
      instance.bankDeposit = 0;
      expect(instance.isFormValid()).toBe(true);
      expect(instance.showBankDepositError).toBe(false);

      // Bank deposit is positive - should be valid
      instance.bankDeposit = 100;
      expect(instance.isFormValid()).toBe(true);
      expect(instance.showBankDepositError).toBe(false);
    });

    it('validates notes as required with trimming', () => {
      const instance = createComponent();
      instance.selectedCustomerId = 1;
      instance.bankDeposit = 100;
      instance.paymentMethod = 'CASH';

      // Empty notes - should be invalid
      instance.notes = '';
      expect(instance.isFormValid()).toBe(false);
      expect(instance.showNotesError).toBe(true);

      // Whitespace only notes - should be invalid and trim
      instance.notes = '   ';
      expect(instance.isFormValid()).toBe(false);
      expect(instance.showNotesError).toBe(true);
      expect(instance.notes).toBe('');

      // Valid notes - should be valid
      instance.notes = 'Valid payment note';
      expect(instance.isFormValid()).toBe(true);
      expect(instance.showNotesError).toBe(false);
    });

    it('calculates total amount from bank deposit only', () => {
      const instance = createComponent();
      instance.bankDeposit = 100;
      instance.serviceFee = 25;
      expect(instance.totalAmount).toBe(100); // Service fee not included

      instance.serviceFee = null;
      expect(instance.totalAmount).toBe(100); // Still works with null service fee

      instance.serviceFee = 0;
      expect(instance.totalAmount).toBe(100); // Still works with 0 service fee
    });
  });
});
