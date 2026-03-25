import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { GlTransaction, GlTransactionLine } from '../../../models/gl-transaction.model';
import { GlTransactionService } from '../../../services/gl-transaction.service';
import { Loader } from '../../../shared/loader/loader';

interface DetailField {
  label: string;
  value: string;
}

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './transaction-detail.html',
  styleUrls: ['./transaction-detail.css'],
})
export class TransactionDetail implements OnInit, OnDestroy {
  transactionId!: number;
  transaction: GlTransaction | null = null;
  summaryFields: DetailField[] = [];
  loading = true;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private transactionService: GlTransactionService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const idParam = params.get('transactionId');
      const parsed = idParam ? Number(idParam) : NaN;

      if (!Number.isFinite(parsed)) {
        this.handleError('Invalid transaction id.');
        return;
      }

      this.transactionId = parsed;
      const navigationTransaction = this.getTransactionFromNavigation();

      if (navigationTransaction && navigationTransaction.id === this.transactionId) {
        this.setTransaction(navigationTransaction);
      } else {
        this.fetchTransaction();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateBack(): void {
    this.router.navigate(['/admin/transactions']);
  }

  retryFetch(): void {
    if (!this.transactionId) {
      return;
    }
    this.fetchTransaction();
  }

  trackByLine(index: number, line: GlTransactionLine): number | string {
    return line.glCode ? `${line.glCode}-${index}` : index;
  }

  formatDate(date?: string | null): string {
    if (!date) {
      return '--';
    }
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(date?: string | null): string {
    if (!date) {
      return '--';
    }
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  formatAmount(value?: number | null): string {
    if (value === null || value === undefined) {
      return '--';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }

  formatStatus(status?: string | null): string {
    if (!status) {
      return 'Unknown';
    }
    return status
      .toLowerCase()
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  getStatusClass(status?: string | null): string {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'posted':
      case 'completed':
        return 'status-success';
      case 'released':
      case 'pending':
      case 'created':
        return 'status-pending';
      case 'failed':
      case 'rejected':
        return 'status-error';
      default:
        return 'status-default';
    }
  }

  getEntryBadgeClass(entryType?: string | null): string {
    const normalized = (entryType || '').toLowerCase();
    if (normalized === 'debit') {
      return 'debit';
    }
    if (normalized === 'credit') {
      return 'credit';
    }
    return 'neutral';
  }

  private fetchTransaction(): void {
    this.loading = true;
    this.error = null;
    this.transaction = null;
    this.transactionService
      .getTransaction(this.transactionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (transaction) => this.setTransaction(transaction),
        error: (error) => {
          const message = this.resolveErrorMessage(error);
          this.handleError(message, true);
        },
      });
  }

  private setTransaction(transaction: GlTransaction): void {
    this.transaction = transaction;
    this.summaryFields = this.buildSummaryFields(transaction);
    this.loading = false;
    this.error = null;
    this.cdr.detectChanges();
  }

  private buildSummaryFields(transaction: GlTransaction): DetailField[] {
    const entries: Array<[string, string | number | null]> = [
      ['Transaction ID', transaction.id],
      ['Company ID', transaction.companyId],
      ['Company Name', transaction.companyName],
      ['Reference Type', transaction.referenceType],
      ['Reference Number', transaction.referenceNumber],
      ['Reference ID', transaction.referenceId],
      ['Transaction Date', this.formatDate(transaction.transactionDate)],
      ['Amount', this.formatAmount(transaction.amount)],
      ['Status', this.formatStatus(transaction.status)],
      ['Description', transaction.description],
      ['Created By', transaction.createdBy],
      ['Created At', this.formatDateTime(transaction.createdAt)],
    ];

    return entries
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([label, value]) => ({ label, value: String(value) }));
  }

  private getTransactionFromNavigation(): GlTransaction | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const state = window.history?.state as { transaction?: GlTransaction } | undefined;
    if (state && state.transaction && typeof state.transaction === 'object') {
      return state.transaction;
    }
    return null;
  }

  private handleError(message: string, showToast = false): void {
    this.loading = false;
    this.error = message;
    this.transaction = null;
    this.summaryFields = [];
    if (showToast) {
      this.toastr.error(message, 'Transaction Detail');
    }
    this.cdr.detectChanges();
  }

  private resolveErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }
    const anyError = error as { error?: { message?: string }; message?: string };
    return anyError?.error?.message || anyError?.message || 'Unable to load transaction.';
  }
}
