import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { CollectionService } from '../../../services/collection-service';
import { of } from 'rxjs';
import {
  DisputeDetailResponse,
  ChangeDisputeStatusResponse,
  DisputeRecord,
} from '../../../models/collection.model';
import { CustomerEntity } from '../../../models/customer.model';
import { Invoice } from '../../../models/invoice.model';

import { DisputeDetails } from './dispute-details';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('DisputeDetails', () => {
  const createComponent = () => {
    const route = { snapshot: { paramMap: { get: () => '4' } } } as unknown as ActivatedRoute;
    const collectionService = createSpyObj<CollectionService>('CollectionService', [
      'getDisputeById',
      'changeDisputeStatus',
    ]);
    const disputeResponse: DisputeDetailResponse = {
      statusCode: 200,
      status: 'success',
      message: 'ok',
      data: createDisputeRecord({
        id: 4,
        disputeId: 'D-4',
        disputedAmount: 25,
      }),
    };
    collectionService.getDisputeById.mockReturnValue(of(disputeResponse));
    collectionService.changeDisputeStatus.mockReturnValue(of({} as ChangeDisputeStatusResponse));
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    return { instance: new DisputeDetails(route, collectionService, cdr), collectionService };
  };

  it('should create', () => {
    const { instance } = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('helpers', () => {
    it('formats dispute statuses', () => {
      const { instance } = createComponent();
      expect(instance.formatStatus('UNDER_REVIEW')).toBe('Under Review');
      expect(instance.formatStatus('UNKNOWN')).toBe('UNKNOWN');
    });

    it('updates dispute status through the service', () => {
      const { instance, collectionService } = createComponent();
      instance.dispute = createDisputeRecord({ id: 4, status: 'OPEN' });
      instance.onUnderReviewClick();
      expect(collectionService.changeDisputeStatus).toHaveBeenCalledWith({ status: 'UNDER_REVIEW' }, 4);
    });
  });
});

function createDisputeRecord(overrides: Partial<DisputeRecord> = {}): DisputeRecord {
  return {
    id: 4,
    disputeId: 'D-4',
    companyId: 1,
    customer: createCustomerStub(),
    invoice: createInvoiceStub(),
    invoiceOriginalAmount: 100,
    disputedAmount: 10,
    disputeCode: 'CODE',
    reason: '',
    status: 'OPEN',
    resolutionDate: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function createCustomerStub(): CustomerEntity {
  return {
    id: 1,
    customerId: 1,
    customerName: 'Acme',
    customerType: 'Business',
    email: 'acme@example.com',
    phoneNumber: null,
    deleted: false,
    address: null,
    cashApplication: null,
    dunning: null,
    eft: null,
    statement: null,
    vat: null,
  };
}

function createInvoiceStub(): Invoice {
  return {
    id: 2,
    invoiceNumber: 'INV-2',
    invoiceDate: '',
    dueDate: '',
    subTotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    description: null,
    balanceDue: 0,
    status: 'OPEN',
    lastPaymentDate: null,
    note: null,
    generated: false,
    active: true,
    deleted: false,
    customer: createCustomerStub(),
  };
}
