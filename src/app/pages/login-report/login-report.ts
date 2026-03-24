import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

import { Loader } from '../../shared/loader/loader';
import { LoginReportService } from '../../services/login-report.service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { CompanyService } from '../../services/company-service';
import { LoginReportEntry } from '../../models/login-report.model';

@Component({
  selector: 'app-login-report',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './login-report.html',
  styleUrls: ['./login-report.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginReport implements OnInit, OnDestroy {
  entries: LoginReportEntry[] = [];
  loading = false;
  error: string | null = null;
  activeCompanyId: number | null = null;
  companyCode: string | null = null;
  companySelectionMessage = 'Select an AR company from the navbar to view login activity.';
  showExportMenu = false;

  private destroy$ = new Subject<void>();

  constructor(
    private loginReportService: LoginReportService,
    private companySelection: CompanySelectionService,
    private companyService: CompanyService,
    private cdr: ChangeDetectorRef,
  ) {}

  @HostListener('document:click')
  onDocumentClick() {
    this.closeExportMenu();
  }

  ngOnInit(): void {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;

      if (this.activeCompanyId === nextId) {
        return;
      }

      this.activeCompanyId = nextId;

      if (!this.activeCompanyId) {
        this.entries = [];
        this.companyCode = null;
        this.error = this.companySelectionMessage;
        this.loading = false;
        this.detectChanges();
        return;
      }

      this.error = null;
      this.fetchCompanyCode(this.activeCompanyId);
      this.loadReport(this.activeCompanyId);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleExportMenu(event: MouseEvent) {
    event.stopPropagation();
    if (!this.entries.length) {
      return;
    }
    this.showExportMenu = !this.showExportMenu;
  }

  onDropdownClick(event: MouseEvent) {
    event.stopPropagation();
  }

  printReport() {
    if (!this.entries.length) {
      alert('No login activity to print.');
      return;
    }
    this.closeExportMenu();
    window.print();
  }

  exportCsv() {
    this.closeExportMenu();
    if (!this.entries.length) {
      alert('No login activity to export.');
      return;
    }

    const rows = this.entries.map((entry) => [
      this.companyCode || 'N/A',
      entry.email || '--',
      this.formatLoginAt(entry.loginAt),
      this.formatStatus(entry.status),
    ]);

    const headers = ['AR Company Code', 'Email', 'Login At', 'Status'];
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => this.escapeCsvValue(cell)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, this.getExportFileName('csv'));
  }

  exportExcel() {
    this.closeExportMenu();
    if (!this.entries.length) {
      alert('No login activity to export.');
      return;
    }

    const headers = ['AR Company Code', 'Email', 'Login At', 'Status'];
    const data = this.entries.map((entry) => [
      this.companyCode || 'N/A',
      entry.email || '--',
      this.formatLoginAt(entry.loginAt),
      this.formatStatus(entry.status),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Login Report');
    XLSX.writeFile(workbook, this.getExportFileName('xlsx'));
  }

  exportPdf() {
    this.closeExportMenu();
    if (!this.entries.length) {
      alert('No login activity to export.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margin = 12;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Login Report', margin, margin + 4);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (this.companyCode) {
      doc.text(`AR Company Code: ${this.companyCode}`, margin, margin + 10);
    }

    const headers = ['AR Company Code', 'Email', 'Login At', 'Status'];
    const baseWidths = [
      Math.max(usableWidth * 0.2, 40),
      Math.max(usableWidth * 0.4, 80),
      Math.max(usableWidth * 0.25, 60),
    ];
    const remainingWidth = Math.max(usableWidth - baseWidths.reduce((sum, width) => sum + width, 0), 40);
    const columnWidths = [...baseWidths, remainingWidth];
    const headerHeight = 10;
    const lineHeight = 4.2;
    let currentY = margin + 18;

    const drawHeader = () => {
      doc.setFillColor(37, 99, 235);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      let currentX = margin;
      headers.forEach((header, index) => {
        const width = columnWidths[index];
        doc.rect(currentX, currentY, width, headerHeight, 'F');
        doc.text(header, currentX + 2, currentY + 6);
        currentX += width;
      });
      currentY += headerHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(17, 24, 39);
    };

    const ensureSpace = (rowHeight: number) => {
      if (currentY + rowHeight > pageHeight - margin) {
        doc.addPage('landscape');
        currentY = margin;
        drawHeader();
      }
    };

    drawHeader();

    this.entries.forEach((entry) => {
      const cells = [
        this.companyCode || 'N/A',
        entry.email || '--',
        this.formatLoginAt(entry.loginAt),
        this.formatStatus(entry.status),
      ];

      const wrapped = cells.map((value, index) =>
        doc.splitTextToSize(value || '--', columnWidths[index] - 4),
      );
      const calculatedHeights = wrapped.map((lines) => Math.max(lines.length, 1) * lineHeight + 4);
      const rowHeight = Math.max(...calculatedHeights, 12);

      ensureSpace(rowHeight);

      let currentX = margin;
      wrapped.forEach((lines, index) => {
        const width = columnWidths[index];
        doc.rect(currentX, currentY, width, rowHeight);
        const content = lines.length ? lines : ['--'];
        let textY = currentY + 5;
        content.forEach((line: string) => {
          doc.text(line, currentX + 2, textY);
          textY += lineHeight;
        });
        currentX += width;
      });

      currentY += rowHeight;
    });

    doc.save(this.getExportFileName('pdf'));
  }

  formatLoginAt(value?: string | null): string {
    if (!value) {
      return '--';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  formatStatus(status?: string | null): string {
    if (!status) {
      return 'Unknown';
    }
    const lower = status.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  private loadReport(companyId: number) {
    this.loading = true;
    this.entries = [];
    this.showExportMenu = false;
    this.detectChanges();

    this.loginReportService
      .getLoginReport(companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (this.activeCompanyId !== companyId) {
            return;
          }
          this.entries = response?.data ?? [];
          this.error = this.entries.length ? null : 'No login activity found for this company.';
          this.loading = false;
          this.detectChanges();
        },
        error: (error) => {
          if (this.activeCompanyId !== companyId) {
            return;
          }
          this.entries = [];
          this.loading = false;
          this.error =
            error?.error?.message || error?.message || 'Unable to load login activity at this time.';
          this.detectChanges();
        },
      });
  }

  private fetchCompanyCode(companyId: number) {
    this.companyService
      .getCompanyById(companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const entity = response?.data;
          this.companyCode = entity?.companyCode || null;
          this.detectChanges();
        },
        error: () => {
          this.companyCode = null;
          this.detectChanges();
        },
      });
  }

  private getExportFileName(extension: string): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .split('.')[0];
    return `login-report_${timestamp}.${extension}`;
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
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
    if (!this.showExportMenu) return;
    this.showExportMenu = false;
    this.detectChanges();
  }

  private detectChanges() {
    this.cdr.detectChanges();
  }
}
