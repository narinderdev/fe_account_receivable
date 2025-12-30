import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { CollectionService } from '../../../services/collection-service';
import { DisputeRecord } from '../../../models/collection.model';
import { Spinner } from '../../../shared/spinner/spinner';
import { ChangeDetectorRef } from '@angular/core';

type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

@Component({
  selector: 'app-dispute-details',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, Spinner],
  templateUrl: './dispute-details.html',
  styleUrls: ['./dispute-details.css'],
})
export class DisputeDetails implements OnInit {
  disputeId!: number;
  dispute: DisputeRecord | null = null;
  loading = true;
  error = '';
  updatingStatus = false;

  constructor(
    private route: ActivatedRoute,
    private collectionService: CollectionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('disputeId');
    const parsedId = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(parsedId)) {
      this.error = 'Invalid dispute id.';
      this.loading = false;
      return;
    }

    this.disputeId = parsedId;
    this.fetchDispute();
  }

  private fetchDispute() {
    this.loading = true;

    this.collectionService.getDisputeById(this.disputeId).subscribe({
      next: (res) => {
        this.dispute = res.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load dispute details.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get customerName(): string {
    return this.dispute?.customer?.customerName || '--';
  }

  get invoiceNumber(): string {
    return this.dispute?.invoice?.invoiceNumber || '--';
  }

  get disputeStatus(): string {
    return this.formatStatus(this.dispute?.status);
  }

  formatStatus(status: string | undefined): string {
    if (!status) return '--';

    const statusMap: { [key: string]: string } = {
      OPEN: 'Open',
      UNDER_REVIEW: 'Under Review',
      RESOLVED: 'Resolved',
      REJECTED: 'Rejected',
    };

    return statusMap[status] || status;
  }

  // Button visibility logic
  get showUnderReviewButton(): boolean {
    return this.dispute?.status === 'OPEN';
  }

  get showResolvedButton(): boolean {
    return this.dispute?.status === 'UNDER_REVIEW';
  }

  get showRejectedButton(): boolean {
    return this.dispute?.status === 'OPEN' || this.dispute?.status === 'UNDER_REVIEW';
  }

  updateStatus(newStatus: DisputeStatus) {
    if (!this.dispute || this.updatingStatus) return;

    this.updatingStatus = true;
    this.collectionService.changeDisputeStatus({ status: newStatus }, this.dispute.id).subscribe({
      next: (res) => {
        if (this.dispute) {
          this.dispute.status = newStatus;
        }
        this.updatingStatus = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to update status:', err);
        this.error = 'Failed to update dispute status.';
        this.updatingStatus = false;
        this.cdr.detectChanges();
      },
    });
  }

  onUnderReviewClick() {
    this.updateStatus('UNDER_REVIEW');
  }

  onResolvedClick() {
    this.updateStatus('RESOLVED');
  }

  onRejectedClick() {
    this.updateStatus('REJECTED');
  }
}
