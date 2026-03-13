import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgingService } from '../../services/aging-service';
import { Customer } from '../../services/customer';
import { Loader } from '../../shared/loader/loader';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { CompanySelectionService } from '../../services/company-selection.service';
import { CompanyService } from '../../services/company-service';
import { Subject, takeUntil } from 'rxjs';
import { CustomerEntity, PaginatedResponse } from '../../models/customer.model';
import { AgingResponse, AgingFilters, AgingRowDto } from '../../models/aging.model';

interface AgingTableRow {
  customer: string;
  totalDue: number;
  current: number;
  buckets: Record<string, number>;
}

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-aging',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './aging.html',
  styleUrls: ['./aging.css'],
})
export class Aging implements OnInit, OnDestroy {
  loading = false;
  showExportMenu = false;

  customers: SelectOption[] = [{ label: 'All Customers', value: '' }];

  statuses: SelectOption[] = [
    { label: 'All Status', value: '' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Partial', value: 'PARTIAL' },
  ];

  selectedCustomer = '';
  selectedStatus = '';
  agingData: AgingTableRow[] = [];
  private allRows: AgingTableRow[] = [];
  bucketLabels: string[] = [];
  pageSize = 10;
  currentPage = 0;
  totalPages = 0;
  totalItems = 0;
  Math = Math;

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  private activeCompanyCode: string | null = null;
  private activeCompanyName: string | null = null;

  constructor(
    private agingService: AgingService,
    private customerService: Customer,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService,
    private companyService: CompanyService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;

      if (this.activeCompanyId === nextId) {
        return;
      }

      this.activeCompanyId = nextId;
      this.activeCompanyCode = null;
      this.activeCompanyName = null;

      if (this.activeCompanyId) {
        this.loadCompanyMetadata(this.activeCompanyId);
        this.loadCustomers(this.activeCompanyId);
        this.loadAgingData(this.activeCompanyId);
      } else {
        this.customers = [{ label: 'All Customers', value: '' }];
        this.selectedCustomer = '';
        this.agingData = [];
        this.allRows = [];
        this.bucketLabels = [];
        this.totalPages = 0;
        this.totalItems = 0;
        this.currentPage = 0;
        this.loading = false;
        this.activeCompanyCode = null;
        this.activeCompanyName = null;
        this.cdr.detectChanges();
      }
    });
  }

  getInitialColor(index: number): { background: string; color: string } {
    const palette = [
      { background: '#DBEAFE', color: '#2563EB' },
      { background: '#F3E8FF', color: '#9333EA' },
      { background: '#FFEDD5', color: '#EA580C' },
      { background: '#FEE2E2', color: '#DC2626' },
      { background: '#E0E7FF', color: '#4F46E5' },
      { background: '#CCFBF1', color: '#0D9488' },
    ];

    const colorIndex = palette.length ? index % palette.length : 0;
    return palette[colorIndex];
  }

  loadCustomers(companyId: number) {
    this.loading = true;
    this.cdr.detectChanges();

    this.customerService.getCustomers(companyId, 0, 50).subscribe({
      next: (res: { data?: PaginatedResponse<CustomerEntity> }) => {
        const content: CustomerEntity[] = res.data?.content ?? [];

        this.customers = [
          { label: 'All Customers', value: '' },
          ...content.map((c: CustomerEntity) => ({
            label: c.customerName,
            value: String(c.id),
          })),
        ];

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (_) => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadAgingData(companyId: number) {
    this.loading = true;
    this.cdr.detectChanges();

    this.agingService.getAging(companyId).subscribe({
      next: (res: AgingResponse) => {
        this.mapResponse(res);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (_) => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onCustomerChange() {
    this.loading = true;
    this.cdr.detectChanges();
    this.fetchWithFilters();
  }

  onStatusChange() {
    this.loading = true;
    this.cdr.detectChanges();
    this.fetchWithFilters();
  }

  toggleExportMenu() {
    this.showExportMenu = !this.showExportMenu;
  }

  closeExportMenu() {
    this.showExportMenu = false;
  }

  printReport() {
    this.closeExportMenu();
    window.print();
  }

  async generatePdf() {
    this.closeExportMenu();
    const element = document.getElementById('agingTable');

    if (!element) {
      console.error('Table element not found!');
      return;
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const contentStartY = this.drawPdfMetadata(pdf);

    let heightLeft = imgHeight;
    let position = contentStartY;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - position;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(this.getExportFileName('pdf'));
  }

  exportToExcel() {
    this.closeExportMenu();

    const wb = XLSX.utils.book_new();

    // Prepare data for export - use ALL rows, not just current page
    const bucketHeaders = [...this.bucketLabels];

    const exportData = [
      ['Customer Aging Report'],
      ['Company Code:', this.getActiveCompanyCode() || 'N/A'],
      ['Generated On:', this.getCurrentDate()],
      ['Customer Filter:', this.getSelectedCustomerLabel()],
      ['Status Filter:', this.getSelectedStatusLabel()],
      ['Total Records:', this.totalItems],
      [],
      ['Customer', 'Total Due', 'Current', ...bucketHeaders],
      ...this.allRows.map((row) => [
        row.customer,
        row.totalDue,
        row.current,
        ...bucketHeaders.map((label) => row.buckets[label] ?? 0),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(exportData);

    // Format the sheet
    this.formatExcelSheet(ws, exportData.length, bucketHeaders.length + 2);

    // Add totals row
    const totals = this.calculateTotals();
    const totalsRow = [
      'TOTAL',
      totals.totalDue,
      totals.current,
      ...bucketHeaders.map((label) => totals.buckets[label] ?? 0),
    ];

    XLSX.utils.sheet_add_aoa(ws, [totalsRow], { origin: -1 });

    XLSX.utils.book_append_sheet(wb, ws, 'Aging Report');
    XLSX.writeFile(wb, this.getExportFileName('xlsx'));
  }

  exportToCSV() {
    this.closeExportMenu();

    // Prepare CSV data - use ALL rows, not just current page
    const bucketHeaders = [...this.bucketLabels];

    const csvData = [
      ['Customer Aging Report'],
      ['Company Code:', this.getActiveCompanyCode() || 'N/A'],
      ['Generated On:', this.getCurrentDate()],
      ['Customer Filter:', this.getSelectedCustomerLabel()],
      ['Status Filter:', this.getSelectedStatusLabel()],
      ['Total Records:', this.totalItems],
      [],
      ['Customer', 'Total Due', 'Current', ...bucketHeaders],
      ...this.allRows.map((row) => [
        row.customer,
        row.totalDue,
        row.current,
        ...bucketHeaders.map((label) => row.buckets[label] ?? 0),
      ]),
    ];

    // Add totals row
    const totals = this.calculateTotals();
    csvData.push([
      'TOTAL',
      totals.totalDue,
      totals.current,
      ...bucketHeaders.map((label) => totals.buckets[label] ?? 0),
    ]);

    const csvContent = csvData
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(','),
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', this.getExportFileName('csv'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private drawPdfMetadata(pdf: jsPDF): number {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    let currentY = margin;

    // Draw header background - increased height to fit all text
    pdf.setFillColor(59, 130, 246); // Blue background (#3B82F6)
    pdf.rect(0, 0, pageWidth, 32, 'F'); // Increased from 28 to 32

    // Set consistent small font size for all header text
    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFontSize(10); // Same size for everything
    pdf.setFont('helvetica', 'normal');

    // Company Name
    const companyName = this.getActiveCompanyName() || 'Customer Aging Report';
    pdf.text(companyName, margin, currentY + 5);

    // Report Title
    pdf.text('Customer Aging Report', margin, currentY + 11);

    // Company Code (if available)
    const companyCode = this.getActiveCompanyCode();
    if (companyCode) {
      pdf.text(`Code: ${companyCode}`, margin, currentY + 17);
    }

    // Generated date - right aligned
    const dateText = `Generated: ${this.getCurrentDate()}`;
    const dateWidth = pdf.getTextWidth(dateText);
    pdf.text(dateText, pageWidth - dateWidth - margin, currentY + 5);

    // Reset to black for content
    pdf.setTextColor(0, 0, 0);
    currentY = 37; // Position after blue header (increased)

    // Filter Information Section
    pdf.setFillColor(249, 250, 251); // Light gray background (#F9FAFB)
    pdf.rect(margin, currentY, pageWidth - 2 * margin, 20, 'F');

    // Add subtle border
    pdf.setDrawColor(229, 231, 235); // Border color (#E5E7EB)
    pdf.setLineWidth(0.5);
    pdf.rect(margin, currentY, pageWidth - 2 * margin, 20, 'S');

    // Filter details
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99); // Gray text (#4B5563)

    const filterY = currentY + 5;
    const col1X = margin + 4;
    const col2X = pageWidth / 2;

    // Left column
    pdf.setFont('helvetica', 'bold');
    pdf.text('Customer:', col1X, filterY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(this.getSelectedCustomerLabel(), col1X + 20, filterY);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Status:', col1X, filterY + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(this.getSelectedStatusLabel(), col1X + 20, filterY + 5);

    // Right column
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total Records:', col2X, filterY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(this.totalItems), col2X + 28, filterY);

    // Total amount
    const totals = this.calculateTotals();
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total Due:', col2X, filterY + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `$${totals.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      col2X + 28,
      filterY + 5,
    );

    // Reset text color for table
    pdf.setTextColor(0, 0, 0);

    // Add spacing before table
    return currentY + 25;
  }

  private getExportMetadataLines(): string[] {
    const metadataLines = [
      `Company Name: ${this.getActiveCompanyName() || 'N/A'}`,
      'Report Name: Customer Aging Report',
      `Generated On: ${this.getCurrentDate()}`,
      `Status Filter: ${this.getSelectedStatusLabel()}`,
      `Total Records: ${this.totalItems}`,
    ];

    const companyCode = this.getActiveCompanyCode();
    if (companyCode) {
      metadataLines.splice(1, 0, `Company Code: ${companyCode}`);
    }

    return metadataLines;
  }

  private calculateTotals() {
    const initialBuckets = this.bucketLabels.reduce<Record<string, number>>((acc, label) => {
      acc[label] = 0;
      return acc;
    }, {});

    return this.allRows.reduce(
      (acc, row) => {
        acc.totalDue += row.totalDue;
        acc.current += row.current;
        this.bucketLabels.forEach((label) => {
          acc.buckets[label] = (acc.buckets[label] ?? 0) + (row.buckets[label] ?? 0);
        });
        return acc;
      },
      {
        totalDue: 0,
        current: 0,
        buckets: initialBuckets,
      },
    );
  }

  getSelectedCustomerLabel(): string {
    const customer = this.customers.find((c) => c.value === this.selectedCustomer);
    return customer ? customer.label : 'All Customers';
  }

  getSelectedStatusLabel(): string {
    const status = this.statuses.find((s) => s.value === this.selectedStatus);
    return status ? status.label : 'All Status';
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatExcelSheet(ws: XLSX.WorkSheet, rowCount: number, colCount: number) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    ws['!cols'] = [];
    for (let i = 0; i <= colCount; i++) {
      ws['!cols'].push({ wch: i === 0 ? 30 : 15 });
    }

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const titleCell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (ws[titleCell]) {
        ws[titleCell].s = {
          font: { bold: true, sz: 14, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: 'E5E7EB' } },
          alignment: { horizontal: 'left', vertical: 'center' },
        };
      }

      const headerRow = 6;
      const headerCell = XLSX.utils.encode_cell({ r: headerRow, c: C });
      if (ws[headerCell]) {
        ws[headerCell].s = {
          font: { bold: true, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: 'F3F4F6' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
    }
  }

  private formatDateForFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}-${hours}${minutes}`;
  }

  private getExportFileName(extension: string): string {
    const codeSegment = this.getCompanyCodeForFileName();
    const dateSegment = this.formatDateForFilename();
    const base = codeSegment ? `aging-report-${codeSegment}` : 'aging-report';
    return `${base}-${dateSegment}.${extension}`;
  }

  private getCompanyCodeForFileName(): string | null {
    const code = this.getActiveCompanyCode();
    if (!code) {
      return null;
    }
    const sanitized = code.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
    return sanitized || null;
  }

  getActiveCompanyCode(): string | null {
    const trimmed = this.activeCompanyCode?.trim();
    return trimmed ? trimmed : null;
  }

  getActiveCompanyName(): string | null {
    const trimmed = this.activeCompanyName?.trim();
    return trimmed ? trimmed : null;
  }

  private loadCompanyMetadata(companyId: number) {
    this.companyService
      .getCompanyById(companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (this.activeCompanyId !== companyId) {
            return;
          }
          const data = response?.data;
          const code = data?.companyCode?.trim();
          const tradeName = data?.tradeName?.trim();
          const legalName = data?.legalName?.trim();
          this.activeCompanyCode = code || null;
          this.activeCompanyName = tradeName || legalName || null;
        },
        error: () => {
          if (this.activeCompanyId === companyId) {
            this.activeCompanyCode = null;
            this.activeCompanyName = null;
          }
        },
      });
  }

  private fetchWithFilters() {
    const filters: AgingFilters = {};

    if (this.selectedCustomer) filters.customerId = Number(this.selectedCustomer);
    if (this.selectedStatus) filters.status = this.selectedStatus;

    if (!this.activeCompanyId) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.agingService.getAging(this.activeCompanyId, filters).subscribe({
      next: (res: AgingResponse) => {
        this.mapResponse(res);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (_) => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mapResponse(res: AgingResponse) {
    const rows: AgingRowDto[] = res.data?.rows ?? [];
    const entryMatrix = rows.map((row) => this.extractBucketEntries(row));

    this.bucketLabels = [];
    entryMatrix.forEach((entries) => {
      entries.forEach(([label]) => this.ensureBucketLabel(label));
    });

    this.allRows = rows.map((r: AgingRowDto, index) => {
      const entryMap: Record<string, number> = {};
      entryMatrix[index].forEach(([label, value]) => {
        entryMap[label] = value;
      });

      const buckets = this.bucketLabels.reduce<Record<string, number>>((acc, label) => {
        acc[label] = entryMap[label] ?? 0;
        return acc;
      }, {});

      return {
        customer: r.customerName,
        totalDue: Number(r.totalDue ?? 0),
        current: Number(r.current ?? 0),
        buckets,
      };
    });
    this.applyPagination(0);
  }

  navigateToAgingCodes() {
    this.router.navigate(['/admin/aging-code']);
  }

  private extractBucketEntries(row: AgingRowDto): Array<[string, number]> {
    const entries: Array<[string, number]> = [];
    if (row.buckets && typeof row.buckets === 'object') {
      Object.entries(row.buckets).forEach(([label, value]) => {
        const normalizedLabel = label?.trim() || 'Bucket';
        entries.push([normalizedLabel, Number(value ?? 0)]);
      });
    } else {
      const fallback: Array<[string, number | null | undefined]> = [
        ['1-30 DAYS', row.bucket1To30],
        ['31-60 DAYS', row.bucket31To60],
        ['61-90 DAYS', row.bucket61To90],
        ['>90 DAYS', row.bucketGt90],
      ];
      fallback.forEach(([label, value]) => entries.push([label, Number(value ?? 0)]));
    }
    return entries;
  }

  private ensureBucketLabel(label: string) {
    const normalized = label || 'Bucket';
    if (!this.bucketLabels.includes(normalized)) {
      this.bucketLabels.push(normalized);
    }
  }

  get totalTableColumns(): number {
    return 3 + this.bucketLabels.length;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const current = this.currentPage + 1;
    const total = this.totalPages;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current <= 3) {
        pages.push(2, 3, 4, -1, total);
      } else if (current >= total - 2) {
        pages.push(-1, total - 3, total - 2, total - 1, total);
      } else {
        pages.push(-1, current - 1, current, current + 1, -1, total);
      }
    }

    return pages;
  }

  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages || page === this.currentPage) {
      return;
    }
    this.applyPagination(page);
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.applyPagination(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.applyPagination(this.currentPage - 1);
    }
  }

  private applyPagination(page: number) {
    this.totalItems = this.allRows.length;
    this.totalPages = this.totalItems ? Math.ceil(this.totalItems / this.pageSize) : 0;
    if (this.totalPages === 0) {
      this.currentPage = 0;
      this.agingData = [];
      return;
    }

    this.currentPage = Math.min(Math.max(page, 0), this.totalPages - 1);
    const start = this.currentPage * this.pageSize;
    this.agingData = this.allRows.slice(start, start + this.pageSize);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
