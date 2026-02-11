import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import jsPDF from 'jspdf';
import { Loader } from '../../../shared/loader/loader';
import { Spinner } from '../../../shared/spinner/spinner';
import { CreditMemoService } from '../../../services/credit-memo-service';
import { CompanySelectionService } from '../../../services/company-selection.service';
import { CreditMemoEntity } from '../../../models/credit-memo.model';

type CreditMemoStatusFilter = 'CREATED' | 'APPROVED';

@Component({
  selector: 'app-credit-memo-detail',
  standalone: true,
  imports: [CommonModule, Loader, Spinner, RouterLink],
  templateUrl: './credit-memo-detail.html',
  styleUrl: './credit-memo-detail.css',
})
export class CreditMemoDetail implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly pageSize = 50;

  memoId: number | null = null;
  companyId: number | null = null;
  memo: CreditMemoEntity | null = null;
  loading = true;
  error: string | null = null;
  exporting = false;
  private statusHint: CreditMemoStatusFilter | null = null;

  constructor(
    private route: ActivatedRoute,
    private creditMemoService: CreditMemoService,
    private companySelection: CompanySelectionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.memoId = this.parseNumberParam(this.route.snapshot.paramMap.get('creditMemoId'));
    this.statusHint = this.normalizeStatus(this.route.snapshot.queryParamMap.get('status'));

    if (!this.memoId) {
      this.setError('Invalid credit memo identifier provided.');
      this.loading = false;
      return;
    }

    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((companyIdValue) => {
        const normalized = this.normalizeCompanyId(companyIdValue);
        if (normalized === this.companyId) {
          return;
        }
        this.companyId = normalized;
        if (this.companyId) {
          this.loadCreditMemo();
        } else {
          this.memo = null;
          this.loading = false;
          this.error = 'Select a company to view credit memo details.';
        }
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  exportToPDF(): void {
    if (!this.memo) return;

    this.exporting = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let yPos = 20;

        // Header with blue background
        doc.setFillColor(59, 130, 246); // #3B82F6
        doc.rect(0, 0, pageWidth, 35, 'F');

        // Company name and title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        const companyName = this.memo?.arCode?.company?.legalName || 'Company';
        doc.text(companyName, 15, yPos);

        doc.setFontSize(10);
        doc.text('Credit Memo Details', 15, yPos + 6);

        // Credit Memo Number
        const memoNo = this.memo?.creditMemoNo || `CM-${this.memo?.id}`;
        doc.text(memoNo, 15, yPos + 12);

        // Generated date (right aligned)
        const dateStr = this.getCurrentDateTime();
        const dateWidth = doc.getTextWidth(dateStr);
        doc.text(dateStr, pageWidth - dateWidth - 15, yPos);

        yPos = 45;

        // Status Badge
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const status = this.getStatusLabel(this.memo?.status);
        const statusText = `Status: ${status}`;
        doc.text(statusText, 15, yPos);
        yPos += 10;

        // Amount Section
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Credit Amount', 15, yPos);
        yPos += 7;

        doc.setFontSize(16);
        const amountStr = this.formatCurrency(this.memo?.amount, this.memo?.currency || 'USD');
        doc.text(amountStr, 15, yPos);
        yPos += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const appliedStr = `Applied: ${this.formatCurrency(this.getAppliedAmount(), this.memo?.currency || 'USD')}`;
        const availableStr = `Available: ${this.formatCurrency(this.getAvailableAmount(), this.memo?.currency || 'USD')}`;
        doc.text(appliedStr, 15, yPos);
        doc.text(availableStr, 80, yPos);
        yPos += 15;

        // Credit Reason
        if (this.memo?.creditReason) {
          doc.setFillColor(249, 250, 251);
          doc.roundedRect(15, yPos - 5, pageWidth - 30, 15, 3, 3, 'F');
          doc.setFontSize(9);
          doc.setTextColor(55, 65, 81);
          const reason = doc.splitTextToSize(this.memo.creditReason, pageWidth - 40);
          doc.text(reason, 18, yPos);
          yPos += 20;
        }

        // Details Section
        yPos = this.drawDetailsSection(doc, yPos, pageWidth);

        // Save PDF
        const fileName = `Credit_Memo_${memoNo}_${this.formatDateForFilename(new Date())}.pdf`;
        doc.save(fileName);

        this.exporting = false;
        this.cdr.detectChanges();
      } catch (error) {
        console.error('PDF export error:', error);
        this.exporting = false;
        this.cdr.detectChanges();
      }
    }, 100);
  }

  private drawDetailsSection(doc: jsPDF, startY: number, pageWidth: number): number {
    let yPos = startY;

    // Section Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Credit Memo Details', 15, yPos);
    yPos += 10;

    // Two-column layout
    const leftX = 15;
    const rightX = pageWidth / 2 + 5;
    const labelWidth = 50;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Left Column
    yPos = this.drawDetailRow(doc, 'Memo ID:', String(this.memo?.id || '—'), leftX, yPos);
    yPos = this.drawDetailRow(doc, 'Currency:', this.memo?.currency || '—', leftX, yPos);
    yPos = this.drawDetailRow(
      doc,
      'Created On:',
      this.formatDate(this.memo?.createdAt),
      leftX,
      yPos,
    );
    yPos = this.drawDetailRow(
      doc,
      'Target Invoice:',
      this.memo?.targetInvoiceId ? `#${this.memo.targetInvoiceId}` : '—',
      leftX,
      yPos,
    );

    // Reset Y for right column
    let rightYPos = startY + 10;

    // Right Column - Customer Info
    rightYPos = this.drawDetailRow(
      doc,
      'Customer:',
      this.memo?.customer?.customerName || 'Unknown',
      rightX,
      rightYPos,
    );
    rightYPos = this.drawDetailRow(
      doc,
      'Email:',
      this.memo?.customer?.email || '—',
      rightX,
      rightYPos,
    );
    rightYPos = this.drawDetailRow(
      doc,
      'Phone:',
      this.memo?.customer?.phoneNumber || '—',
      rightX,
      rightYPos,
    );
    rightYPos = this.drawDetailRow(
      doc,
      'AR Code:',
      this.memo?.arCode?.code || '—',
      rightX,
      rightYPos,
    );

    // Use the larger yPos
    yPos = Math.max(yPos, rightYPos) + 10;

    // Customer Address (full width)
    if (this.memo?.customer?.address) {
      doc.setFont('helvetica', 'bold');
      doc.text('Customer Address:', leftX, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 5;

      const address = this.getCustomerAddressLines();
      address.forEach((line) => {
        doc.text(line, leftX + 5, yPos);
        yPos += 5;
      });
    }

    return yPos;
  }

  private drawDetailRow(doc: jsPDF, label: string, value: string, x: number, y: number): number {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 114, 128);
    doc.text(label, x, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.text(value, x + 35, y);

    return y + 7;
  }

  private formatCurrency(amount: number | undefined, currency: string): string {
    const safeAmount = amount ?? 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  }

  private getCurrentDateTime(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${month}/${day}/${year} at ${hours}:${minutes} ${ampm}`;
  }

  private formatDateForFilename(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getAppliedAmount(): number {
    return Number(this.memo?.appliedAmount || 0);
  }

  getAvailableAmount(): number {
    if (!this.memo) {
      return 0;
    }
    const available = this.memo.amount - this.getAppliedAmount();
    return available > 0 ? available : 0;
  }

  getStatusLabel(status?: string | null): string {
    if (!status) {
      return 'Unknown';
    }
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'CREATED':
        return 'Created';
      case 'APPROVED':
        return 'Approved';
      case 'POSTED':
        return 'Posted';
      default:
        return normalized.charAt(0) + normalized.slice(1).toLowerCase();
    }
  }

  getStatusClass(status?: string | null): string {
    if (!status) {
      return '';
    }
    const normalized = status.toUpperCase();
    if (normalized === 'CREATED') {
      return 'status-created';
    }
    if (['APPROVED', 'POSTED', 'ALLOWED'].includes(normalized)) {
      return 'status-approved';
    }
    return `status-${normalized.toLowerCase()}`;
  }

  getCustomerAddressLines(): string[] {
    const address = this.memo?.customer?.address;
    if (!address) {
      return [];
    }
    const lines = [
      [address.addressLine1, address.addressLine2].filter(Boolean).join(', '),
      [address.city, address.stateProvince].filter(Boolean).join(', '),
      [address.postalCode, address.country].filter(Boolean).join(', '),
    ];
    return lines.filter((line) => line && line.trim().length > 0);
  }

  retry(): void {
    this.loadCreditMemo();
  }

  private loadCreditMemo(): void {
    if (!this.memoId || !this.companyId) {
      this.setError('Select a company to view this credit memo.');
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;
    this.memo = null;

    const statusQueue = this.buildStatusPriority();
    this.searchMemoAcrossStatuses(statusQueue, 0);
  }

  private searchMemoAcrossStatuses(
    statuses: (CreditMemoStatusFilter | undefined)[],
    index: number,
  ): void {
    if (this.memo || this.error) {
      return;
    }
    if (index >= statuses.length) {
      this.loading = false;
      if (!this.error) {
        this.error = 'Credit memo not found for the selected company.';
      }
      this.cdr.detectChanges();
      return;
    }

    const status = statuses[index];
    this.fetchMemoPage(status, 0, () => this.searchMemoAcrossStatuses(statuses, index + 1));
  }

  private fetchMemoPage(
    status: CreditMemoStatusFilter | undefined,
    page: number,
    onComplete: () => void,
  ): void {
    if (!this.memoId || !this.companyId || this.memo) {
      return;
    }

    this.creditMemoService
      .getCompanyCreditMemos(this.companyId, status, page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (this.memo) {
            return;
          }
          const pageData = response?.data;
          const memo = pageData?.content?.find((item) => item.id === this.memoId) ?? null;

          if (memo) {
            this.memo = memo;
            this.loading = false;
            this.error = null;
            this.cdr.detectChanges();
            return;
          }

          const totalPages = pageData?.totalPages ?? 0;
          if (page < totalPages - 1) {
            this.fetchMemoPage(status, page + 1, onComplete);
          } else {
            onComplete();
          }
        },
        error: (error) => {
          this.setError(error?.error?.message || 'Unable to load credit memo.');
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private buildStatusPriority(): (CreditMemoStatusFilter | undefined)[] {
    const order: (CreditMemoStatusFilter | undefined)[] = [];
    if (this.statusHint) {
      order.push(this.statusHint);
    }
    if (!order.includes('CREATED')) {
      order.push('CREATED');
    }
    if (!order.includes('APPROVED')) {
      order.push('APPROVED');
    }
    order.push(undefined);
    return order;
  }

  private parseNumberParam(value: string | null): number | null {
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeStatus(value: string | null): CreditMemoStatusFilter | null {
    if (!value) {
      return null;
    }
    const normalized = value.toUpperCase();
    return normalized === 'CREATED' || normalized === 'APPROVED'
      ? (normalized as CreditMemoStatusFilter)
      : null;
  }

  private normalizeCompanyId(value: string | number | null | undefined): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private setError(message: string): void {
    this.error = message;
    this.memo = null;
  }
}
