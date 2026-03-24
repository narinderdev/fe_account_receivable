import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

import { Loader } from '../../shared/loader/loader';
import { GlTransaction } from '../../models/gl-transaction.model';
import { GlTransactionService } from '../../services/gl-transaction.service';
import { CompanySelectionService } from '../../services/company-selection.service';

interface TransactionsState {
  transactions: GlTransaction[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './transactions.html',
  styleUrls: ['./transactions.css'],
})
export class Transactions implements OnInit, OnDestroy {
  selectedPeriod = '12';
  isCustomPeriod = false;
  fromDate: string | null = null;
  toDate: string | null = null;
  Math = Math;

  showExportMenu = false;
  companySelectionMessage = 'Select an AR company from the navbar to view GL transactions.';
  periodOptions = [
    { value: '1', label: 'Last 1 Month' },
    { value: '2', label: 'Last 2 Months' },
    { value: '6', label: 'Last 6 Months' },
    { value: '12', label: 'Last 12 Months' },
    { value: 'custom', label: 'Custom Date Range' },
  ];

  state: TransactionsState = this.buildInitialState();

  activeCompanyId: number | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private glTransactionService: GlTransactionService,
    private companySelection: CompanySelectionService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  @HostListener('document:click')
  onDocumentClick() {
    this.closeExportMenu();
  }

  ngOnInit(): void {
    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        const parsed = id ? Number(id) : NaN;
        const nextId = Number.isFinite(parsed) ? parsed : null;

        if (this.activeCompanyId === nextId) {
          return;
        }

        this.activeCompanyId = nextId;

        if (!this.activeCompanyId) {
          this.state = this.buildInitialState();
          this.cdr.detectChanges();
          return;
        }

        this.loadTransactions(this.activeCompanyId, 0);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPeriodChange(): void {
    if (this.selectedPeriod === 'custom') {
      this.isCustomPeriod = true;
      return;
    }

    this.isCustomPeriod = false;
    this.fromDate = null;
    this.toDate = null;
    this.reloadWithFilters();
  }

  handleFromDateChange(value: string | null) {
    this.fromDate = value || null;
    this.triggerCustomReload();
  }

  handleToDateChange(value: string | null) {
    this.toDate = value || null;
    this.triggerCustomReload();
  }

  goToPage(pageIndex: number): void {
    if (!this.activeCompanyId) return;
    if (pageIndex < 0 || pageIndex >= this.state.totalPages || pageIndex === this.state.currentPage) {
      return;
    }
    this.loadTransactions(this.activeCompanyId, pageIndex);
  }

  nextPage(): void {
    if (!this.activeCompanyId) return;
    if (this.state.currentPage < this.state.totalPages - 1) {
      this.loadTransactions(this.activeCompanyId, this.state.currentPage + 1);
    }
  }

  prevPage(): void {
    if (!this.activeCompanyId) return;
    if (this.state.currentPage > 0) {
      this.loadTransactions(this.activeCompanyId, this.state.currentPage - 1);
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.state.totalPages;

    if (total <= 0) {
      return pages;
    }

    const current = this.state.currentPage + 1;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (current <= 3) {
      pages.push(2, 3, 4, -1, total);
    } else if (current >= total - 2) {
      pages.push(-1, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(-1, current - 1, current, current + 1, -1, total);
    }

    return pages;
  }

  toggleExportMenu(event: MouseEvent) {
    event.stopPropagation();
    if (!this.state.transactions.length) {
      return;
    }
    this.showExportMenu = !this.showExportMenu;
  }

  onDropdownClick(event: MouseEvent) {
    event.stopPropagation();
  }

  printTransactions() {
    this.closeExportMenu();
    if (!this.state.transactions.length) {
      this.toastr.info('There are no transactions to print yet.', 'GL Transactions');
      return;
    }
    window.print();
  }

  exportCsv() {
    this.closeExportMenu();
    const rows = this.state.transactions;
    if (!rows.length) {
      alert('No transactions to export.');
      return;
    }

    const headers = [
      'Reference Type',
      'Reference Number',
      'Transaction Date',
      'Amount',
      'Status',
      'Description',
      'Entry Details',
    ];

    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    rows.forEach((tx) => {
      const row = [
        this.escapeCsvValue(tx.referenceType || '--'),
        this.escapeCsvValue(tx.referenceNumber || '--'),
        this.escapeCsvValue(this.formatDate(tx.transactionDate)),
        this.escapeCsvValue(this.formatAmount(tx.amount)),
        this.escapeCsvValue(this.formatStatus(tx.status)),
        this.escapeCsvValue(tx.description || '--'),
        this.escapeCsvValue(this.getEntrySummary(tx)),
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, this.getExportFileName('csv'));
  }

  exportExcel() {
    this.closeExportMenu();
    const rows = this.state.transactions;
    if (!rows.length) {
      alert('No transactions to export.');
      return;
    }

    const headers = [
      'Reference Type',
      'Reference Number',
      'Transaction Date',
      'Amount',
      'Status',
      'Description',
      'Entry Details',
    ];

    const data = rows.map((tx) => [
      tx.referenceType || '--',
      tx.referenceNumber || '--',
      this.formatDate(tx.transactionDate),
      this.formatAmount(tx.amount),
      this.formatStatus(tx.status),
      tx.description || '--',
      this.getEntrySummary(tx),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'GL Transactions');
    XLSX.writeFile(workbook, this.getExportFileName('xlsx'));
  }

  exportPdf() {
    this.closeExportMenu();
    const rows = this.state.transactions;
    if (!rows.length) {
      alert('No transactions to export.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margin = 12;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;

    const headers = [
      'Reference',
      'Transaction Date',
      'Amount',
      'Status',
      'Description',
      'Entries',
    ];

    const baseWidths = [50, 35, 28, 30, 70];
    const remainingWidth = Math.max(usableWidth - baseWidths.reduce((sum, value) => sum + value, 0), 40);
    const columnWidths = [...baseWidths, remainingWidth];

    const headerHeight = 10;
    const lineHeight = 4.2;
    let currentY = margin + 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('GL Transactions', margin, margin + 4);
    doc.setFontSize(10);
    if (this.activeCompanyId) {
      doc.text(`Company ID: ${this.activeCompanyId}`, margin, margin + 10);
    }

    const drawHeader = () => {
      doc.setFillColor(37, 99, 235);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);

      let headerX = margin;
      headers.forEach((header, index) => {
        const width = columnWidths[index];
        doc.rect(headerX, currentY, width, headerHeight, 'F');
        doc.text(header, headerX + 2, currentY + 6);
        headerX += width;
      });
      currentY += headerHeight;
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    };

    const ensureSpace = (rowHeight: number) => {
      if (currentY + rowHeight > pageHeight - margin) {
        doc.addPage('landscape');
        currentY = margin;
        drawHeader();
      }
    };

    drawHeader();

    rows.forEach((tx) => {
      const cellValues = [
        `${tx.referenceType || '--'} ${tx.referenceNumber ? `(${tx.referenceNumber})` : ''}`.trim(),
        this.formatDate(tx.transactionDate),
        this.formatAmount(tx.amount),
        this.formatStatus(tx.status),
        tx.description || '--',
        this.getEntrySummary(tx),
      ];

      const wrapped = cellValues.map((value, index) =>
        doc.splitTextToSize(value || '--', columnWidths[index] - 4),
      );

      const calculatedHeights = wrapped.map((lines) => Math.max(lines.length, 1) * lineHeight + 4);
      const rowHeight = Math.max(...calculatedHeights, 12);
      ensureSpace(rowHeight);

      let cellX = margin;
      wrapped.forEach((lines, index) => {
        const width = columnWidths[index];
        doc.rect(cellX, currentY, width, rowHeight);
        let textY = currentY + 5;
        const content = lines.length ? lines : ['--'];
        content.forEach((line: string) => {
          doc.text(line, cellX + 2, textY);
          textY += lineHeight;
        });
        cellX += width;
      });

      currentY += rowHeight;
    });

    doc.save(this.getExportFileName('pdf'));
  }

  trackByTransaction(_: number, transaction: GlTransaction) {
    return transaction.id ?? transaction.referenceNumber ?? _;
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

  private loadTransactions(companyId: number, page: number = 0): void {
    const params = this.buildQueryParams(page);
    this.state = {
      ...this.state,
      loading: true,
      error: null,
    };

    this.glTransactionService
      .getTransactions(companyId, params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const pageData = response?.data;
          const content = pageData?.content ?? [];

          this.state = {
            ...this.state,
            transactions: [...content],
            loading: false,
            error: null,
            currentPage: pageData?.number ?? page,
            totalPages: pageData?.totalPages ?? 0,
            totalItems: pageData?.totalElements ?? content.length,
            pageSize: pageData?.size ?? this.state.pageSize,
          };
          this.cdr.detectChanges();
        },
        error: (error) => {
          const message = this.resolveErrorMessage(error);
          this.state = {
            ...this.state,
            transactions: [],
            loading: false,
            error: message,
            currentPage: 0,
            totalPages: 0,
            totalItems: 0,
          };
          this.toastr.error(message, 'GL Transactions');
          this.cdr.detectChanges();
        },
      });
  }

  private buildQueryParams(page: number) {
    const pageSize = this.state.pageSize || 10;
    const params: {
      page: number;
      size: number;
      months?: number;
      fromDate?: string;
      toDate?: string;
    } = {
      page,
      size: pageSize,
    };

    if (this.isCustomPeriod) {
      if (this.fromDate) {
        params.fromDate = this.fromDate;
      }
      if (this.toDate) {
        params.toDate = this.toDate;
      }
    } else {
      const parsed = parseInt(this.selectedPeriod, 10);
      params.months = Number.isFinite(parsed) ? parsed : 12;
    }

    return params;
  }

  private reloadWithFilters(): void {
    if (!this.activeCompanyId) {
      return;
    }
    this.loadTransactions(this.activeCompanyId, 0);
  }

  private triggerCustomReload(): void {
    if (!this.isCustomPeriod) {
      return;
    }
    if (this.fromDate && this.toDate) {
      if (new Date(this.fromDate) > new Date(this.toDate)) {
        this.toastr.warning('From date cannot be after To date.', 'Invalid date range');
        return;
      }
      this.reloadWithFilters();
    }
  }

  private getEntrySummary(tx: GlTransaction): string {
    if (!tx.lines || tx.lines.length === 0) {
      return '--';
    }
    return tx.lines
      .map((line) => {
        const amount = line.amount !== undefined && line.amount !== null ? this.formatAmount(line.amount) : '';
        return `${line.entryType || 'N/A'}${amount ? ` ${amount}` : ''}`;
      })
      .join('; ');
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private buildInitialState(errorMessage: string | null = null): TransactionsState {
    return {
      transactions: [],
      loading: false,
      error: errorMessage,
      currentPage: 0,
      totalPages: 0,
      totalItems: 0,
      pageSize: 10,
    };
  }

  private getExportFileName(extension: string): string {
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(
      now.getMinutes(),
    )}`;
    return `gl-transactions-${timestamp}.${extension}`;
  }

  private downloadBlob(blob: Blob, filename: string) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private closeExportMenu() {
    this.showExportMenu = false;
    this.cdr.detectChanges();
  }

  private resolveErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }
    const anyError = error as { error?: { message?: string }; message?: string };
    return anyError?.error?.message || anyError?.message || 'Unable to load GL transactions.';
  }
}
