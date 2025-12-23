import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { CollectionService } from '../../../services/collection-service';
import { DisputeRecord } from '../../../models/collection.model';
import { Spinner } from '../../../shared/spinner/spinner';
import { ChangeDetectorRef } from '@angular/core';

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
    return this.dispute?.status || '--';
  }
}
