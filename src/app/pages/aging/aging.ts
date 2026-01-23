import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgingService } from '../../services/aging-service';
import { Customer } from '../../services/customer';
import { Loader } from '../../shared/loader/loader';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { CustomerEntity, PaginatedResponse } from '../../models/customer.model';
import { AgingResponse, AgingFilters, AgingRowDto } from '../../models/aging.model';

interface AgingTableRow {
  customer: string;
  totalDue: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days90plus: number;
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
    { label: 'All Statuses', value: '' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Partial', value: 'PARTIAL' },
  ];

  selectedCustomer = '';
  selectedStatus = '';
  agingData: AgingTableRow[] = [];
  private allRows: AgingTableRow[] = [];
  pageSize = 10;
  currentPage = 0;
  totalPages = 0;
  totalItems = 0;
  Math = Math;

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;

  constructor(
    private agingService: AgingService,
    private customerService: Customer,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService,
  ) {}

  ngOnInit() {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;

      if (this.activeCompanyId === nextId) {
        return;
      }

      this.activeCompanyId = nextId;

      if (this.activeCompanyId) {
        this.loadCustomers(this.activeCompanyId);
        this.loadAgingData(this.activeCompanyId);
      } else {
        this.customers = [{ label: 'All Customers', value: '' }];
        this.selectedCustomer = '';
        this.agingData = [];
        this.allRows = [];
        this.totalPages = 0;
        this.totalItems = 0;
        this.currentPage = 0;
        this.loading = false;
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

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save('aging-report.pdf');
  }

  exportToExcel() {
    this.closeExportMenu();

    const wb = XLSX.utils.book_new();

    // Prepare data for export - use ALL rows, not just current page
    const exportData = [
      ['Customer Aging Report'],
      ['Generated On:', this.getCurrentDate()],
      ['Customer Filter:', this.getSelectedCustomerLabel()],
      ['Status Filter:', this.getSelectedStatusLabel()],
      ['Total Records:', this.totalItems],
      [],
      ['Customer', 'Total Due', 'Current', '1-30 Days', '31-60 Days', '>90 Days'],
      ...this.allRows.map((row) => [
        row.customer,
        row.totalDue,
        row.current,
        row.days1to30,
        row.days31to60,
        row.days90plus,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(exportData);

    // Format the sheet
    this.formatExcelSheet(ws, exportData.length, 6);

    // Add totals row
    const totals = this.calculateTotals();
    const totalsRow = [
      'TOTAL',
      totals.totalDue,
      totals.current,
      totals.days1to30,
      totals.days31to60,
      totals.days90plus,
    ];

    XLSX.utils.sheet_add_aoa(ws, [totalsRow], { origin: -1 });

    XLSX.utils.book_append_sheet(wb, ws, 'Aging Report');
    XLSX.writeFile(wb, `aging-report-${this.formatDateForFilename()}.xlsx`);
  }

  exportToCSV() {
    this.closeExportMenu();

    // Prepare CSV data - use ALL rows, not just current page
    const csvData = [
      ['Customer Aging Report'],
      ['Generated On:', this.getCurrentDate()],
      ['Customer Filter:', this.getSelectedCustomerLabel()],
      ['Status Filter:', this.getSelectedStatusLabel()],
      ['Total Records:', this.totalItems],
      [],
      ['Customer', 'Total Due', 'Current', '1-30 Days', '31-60 Days', '>90 Days'],
      ...this.allRows.map((row) => [
        row.customer,
        row.totalDue,
        row.current,
        row.days1to30,
        row.days31to60,
        row.days90plus,
      ]),
    ];

    // Add totals row
    const totals = this.calculateTotals();
    csvData.push([
      'TOTAL',
      totals.totalDue,
      totals.current,
      totals.days1to30,
      totals.days31to60,
      totals.days90plus,
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
    link.setAttribute('download', `aging-report-${this.formatDateForFilename()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private calculateTotals() {
    return this.allRows.reduce(
      (acc, row) => ({
        totalDue: acc.totalDue + row.totalDue,
        current: acc.current + row.current,
        days1to30: acc.days1to30 + row.days1to30,
        days31to60: acc.days31to60 + row.days31to60,
        days90plus: acc.days90plus + row.days90plus,
      }),
      {
        totalDue: 0,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days90plus: 0,
      },
    );
  }

  private getSelectedCustomerLabel(): string {
    const customer = this.customers.find((c) => c.value === this.selectedCustomer);
    return customer ? customer.label : 'All Customers';
  }

  private getSelectedStatusLabel(): string {
    const status = this.statuses.find((s) => s.value === this.selectedStatus);
    return status ? status.label : 'All Statuses';
  }

  private getCurrentDate(): string {
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

    this.allRows = rows.map((r: AgingRowDto) => ({
      customer: r.customerName,
      totalDue: r.totalDue,
      current: r.current,
      days1to30: r.bucket1To30,
      days31to60: r.bucket31To60,
      days90plus: r.bucketGt90,
    }));
    this.applyPagination(0);
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
