import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { CollectionService } from '../../../services/collection-service';
import { of } from 'rxjs';
import { DisputeDetailResponse } from '../../../models/collection.model';

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
      data: {
        id: 4,
        disputeId: 'D-4',
        companyId: 1,
        customer: { id: 1, customerName: 'Acme' } as any,
        invoice: { id: 2, invoiceNumber: 'INV-2' } as any,
        invoiceOriginalAmount: 100,
        disputedAmount: 25,
        disputeCode: 'CODE',
        reason: '',
        status: 'OPEN',
        resolutionDate: null,
        createdAt: '',
        updatedAt: '',
      },
    };
    collectionService.getDisputeById.mockReturnValue(of(disputeResponse));
    collectionService.changeDisputeStatus.mockReturnValue(of({}));
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
      instance.dispute = { id: 4, status: 'OPEN' } as any;
      instance.onUnderReviewClick();
      expect(collectionService.changeDisputeStatus).toHaveBeenCalledWith({ status: 'UNDER_REVIEW' }, 4);
    });
  });
});