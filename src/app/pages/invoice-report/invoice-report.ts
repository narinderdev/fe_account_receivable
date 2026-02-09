import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Invoice, InvoicePage } from '../../models/invoice.model';
import { CompanySelectionService } from '../../services/company-selection.service';
import { CompanyService } from '../../services/company-service';
import { InvoiceService } from '../../services/invoice-service';
import { Loader } from '../../shared/loader/loader';
import { InvoiceReportService } from 'src/app/services/invoice-report-service';

interface InvoiceStatusCount {
  status: string;
  count: number;
  percentage: number;
}

interface OverdueBreakdown {
  range: string;
  count: number;
}

@Component({
  selector: 'app-invoice-report',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader, BaseChartDirective],
  templateUrl: './invoice-report.html',
  styleUrl: './invoice-report.css',
})
export class InvoiceReport implements OnInit, OnDestroy {
  fromDate: string | null = null;
  toDate: string | null = null;
  allInvoices: Invoice[] = [];
  statusCounts: InvoiceStatusCount[] = [];
  totalInvoices = 0;
  overdueBreakdown: OverdueBreakdown[] = [];
  selectedDateRange: string = 'LAST_1_MONTH';
  selectedMonths: number = 6;
  pieChartLoading = false;
  barChartLoading = false;
  showExportMenu = false;

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  private activeCompanyCode: string | null = null;

  readonly dateRangeOptions = [
    { label: 'Last 1 Month', value: 'LAST_1_MONTH' },
    { label: 'Last 2 Months', value: 'LAST_2_MONTHS' },
    { label: 'Last 3 Months', value: 'LAST_3_MONTHS' },
    { label: 'Last 6 Months', value: 'LAST_6_MONTHS' },
    { label: 'Last 12 Months', value: 'LAST_12_MONTHS' },
    { label: 'Custom Date', value: 'CUSTOM' },
  ];

  readonly monthsOptions = [
    { label: '1 Month', value: 1 },
    { label: '3 Months', value: 3 },
    { label: '6 Months', value: 6 },
    { label: '12 Months', value: 12 },
  ];

  pieChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: ['#3B82F6', '#F59E0B', '#10B981', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  pieChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = this.statusCounts.find((s) => s.status === label)?.percentage || 0;
            return `${label}: ${value} (${percentage.toFixed(1)}%)`;
          },
        },
      },
    },
    cutout: '65%',
  };

  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: '#3B82F6',
        borderRadius: 6,
        barThickness: 40,
      },
    ],
  };

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `Invoices: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
        grid: {
          color: '#F3F4F6',
        },
      },
    },
  };

  constructor(
    private invoiceService: InvoiceService,
    private invoiceReportService: InvoiceReportService,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService,
    private companyService: CompanyService,
  ) {}

  ngOnInit() {
    this.initializeStaticData();

    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((companyIdValue) => {
        const parsed = companyIdValue ? Number(companyIdValue) : NaN;
        const nextCompanyId = Number.isFinite(parsed) ? parsed : null;

        if (this.activeCompanyId === nextCompanyId) {
          return;
        }

        this.activeCompanyId = nextCompanyId;
        this.activeCompanyCode = null;

        if (this.activeCompanyId) {
          this.loadCompanyMetadata(this.activeCompanyId);
          this.loadInvoiceData(this.activeCompanyId);
          this.loadStatusBreakdown(this.activeCompanyId, this.selectedMonths);
        } else {
          this.resetState();
          this.cdr.detectChanges();
        }
      });
  }

  private resetState() {
    this.allInvoices = [];
    this.fromDate = null;
    this.toDate = null;
    this.selectedDateRange = 'LAST_1_MONTH';
    this.selectedMonths = 6;
    this.pieChartLoading = false;
    this.barChartLoading = false;
    this.activeCompanyCode = null;
    this.initializeStaticData();
    this.cdr.detectChanges();
  }

  private initializeStaticData() {
    this.totalInvoices = 12;
    this.statusCounts = [
      { status: 'OPEN', count: 8, percentage: 66.7 },
      { status: 'PARTIAL', count: 1, percentage: 8.3 },
      { status: 'PAID', count: 2, percentage: 16.7 },
      { status: 'WRITTEN_OFF', count: 1, percentage: 8.3 },
    ];

    this.pieChartData.labels = this.statusCounts.map((s) => s.status);
    this.pieChartData.datasets[0].data = this.statusCounts.map((s) => s.count);

    this.overdueBreakdown = [
      { range: 'CURRENT', count: 5 },
      { range: '1-30 DAYS', count: 2 },
      { range: '31-60 DAYS', count: 3 },
      { range: '61-90 DAYS', count: 1 },
      { range: '>90 DAYS', count: 1 },
    ];

    this.barChartData.labels = this.overdueBreakdown.map((item) => item.range);
    this.barChartData.datasets[0].data = this.overdueBreakdown.map((item) => item.count);
  }

  loadInvoiceData(companyId: number) {
    this.barChartLoading = true;
    this.cdr.detectChanges();

    this.invoiceReportService.getInvoiceAging(companyId).subscribe({
      next: (response) => {
        const agingData = response.data;

        this.barChartData.labels = ['Current', '0-30 Days', '31-60 Days', '61-90 Days', '90+ Days'];
        this.barChartData.datasets[0].data = [
          agingData.current,
          agingData.days0to30,
          agingData.days31to60,
          agingData.days61to90,
          agingData.days90Plus,
        ];

        this.barChartLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.barChartLoading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.barChartLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadStatusBreakdown(companyId: number, months: number) {
  this.pieChartLoading = true;
  this.cdr.detectChanges();

  this.invoiceReportService.getInvoiceStatus(companyId, months).subscribe({
    next: (response) => {
      if (response.statusCode === 200 && response.data) {
        const data = response.data;

        this.totalInvoices = data.total || 0;
        this.statusCounts = [
          {
            status: 'Open',
            count: data.open || 0,
            percentage:
              this.totalInvoices > 0 ? ((data.open || 0) / this.totalInvoices) * 100 : 0,
          },
          {
            status: 'Partial',
            count: data.partial || 0,
            percentage:
              this.totalInvoices > 0 ? ((data.partial || 0) / this.totalInvoices) * 100 : 0,
          },
          {
            status: 'Paid',
            count: data.paid || 0,
            percentage:
              this.totalInvoices > 0 ? ((data.paid || 0) / this.totalInvoices) * 100 : 0,
          },
          {
            status: 'Written Off',
            count: data.writtenOff || 0,
            percentage:
              this.totalInvoices > 0 ? ((data.writtenOff || 0) / this.totalInvoices) * 100 : 0,
          },
        ];

        // Remove this line to show all statuses including zeros:
        // this.statusCounts = this.statusCounts.filter((s) => s.count > 0);

        this.pieChartData.labels = this.statusCounts.map((s) => s.status);
        this.pieChartData.datasets[0].data = this.statusCounts.map((s) => s.count);

        this.cdr.detectChanges();
      }
    },
    error: (error) => {
      console.error('Error loading status breakdown:', error);
      this.pieChartLoading = false;
      this.cdr.detectChanges();
    },
    complete: () => {
      this.pieChartLoading = false;
      this.cdr.detectChanges();
    },
  });
}

  handleMonthsChange(months: number) {
    this.selectedMonths = months;
    if (this.activeCompanyId) {
      this.loadStatusBreakdown(this.activeCompanyId, months);
    }
  }

  private calculateStatusBreakdown() {
    const statusMap = new Map<string, number>();

    this.allInvoices.forEach((invoice) => {
      const status = invoice.status || 'UNKNOWN';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    this.statusCounts = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: this.totalInvoices > 0 ? (count / this.totalInvoices) * 100 : 0,
    }));

    this.pieChartData.labels = this.statusCounts.map((s) => s.status);
    this.pieChartData.datasets[0].data = this.statusCounts.map((s) => s.count);
  }

  private calculateOverdueBreakdown() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ranges = {
      CURRENT: 0,
      '1-30 DAYS': 0,
      '31-60 DAYS': 0,
      '61-90 DAYS': 0,
      '>90 DAYS': 0,
    };

    this.allInvoices.forEach((invoice) => {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;

      if (!dueDate) {
        return;
      }

      const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 0) {
        ranges['CURRENT']++;
      } else if (daysDiff <= 30) {
        ranges['1-30 DAYS']++;
      } else if (daysDiff <= 60) {
        ranges['31-60 DAYS']++;
      } else if (daysDiff <= 90) {
        ranges['61-90 DAYS']++;
      } else {
        ranges['>90 DAYS']++;
      }
    });

    this.overdueBreakdown = Object.entries(ranges).map(([range, count]) => ({
      range,
      count,
    }));

    this.barChartData.labels = this.overdueBreakdown.map((item) => item.range);
    this.barChartData.datasets[0].data = this.overdueBreakdown.map((item) => item.count);
  }

  formatDate(date: string | null | undefined) {
    if (!date) {
      return '';
    }
    return new Date(date).toLocaleDateString('en-US');
  }

  handleFromDateChange(value: string) {
    this.fromDate = value || null;
    this.reloadWithFilters();
  }

  handleToDateChange(value: string) {
    this.toDate = value || null;
    this.reloadWithFilters();
  }

  handleDateRangeChange(value: string) {
    this.selectedDateRange = value;

    if (value === 'CUSTOM') {
      return;
    }

    const today = new Date();
    const toDate = this.formatDateForInput(today);
    let fromDate: string;

    switch (value) {
      case 'LAST_1_MONTH':
        fromDate = this.formatDateForInput(this.subtractMonths(today, 1));
        break;
      case 'LAST_2_MONTHS':
        fromDate = this.formatDateForInput(this.subtractMonths(today, 2));
        break;
      case 'LAST_3_MONTHS':
        fromDate = this.formatDateForInput(this.subtractMonths(today, 3));
        break;
      case 'LAST_6_MONTHS':
        fromDate = this.formatDateForInput(this.subtractMonths(today, 6));
        break;
      case 'LAST_12_MONTHS':
        fromDate = this.formatDateForInput(this.subtractMonths(today, 12));
        break;
      default:
        fromDate = toDate;
    }

    this.fromDate = fromDate;
    this.toDate = toDate;
    this.reloadWithFilters();
  }

  private subtractMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isCustomDateRange(): boolean {
    return this.selectedDateRange === 'CUSTOM';
  }

  getSelectedDateRangeLabel(): string {
    const option = this.dateRangeOptions.find((opt) => opt.value === this.selectedDateRange);
    return option ? option.label : 'Custom';
  }

  private reloadWithFilters() {
    if (!this.activeCompanyId) {
      return;
    }
    this.loadInvoiceData(this.activeCompanyId);
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

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      OPEN: '#3B82F6',
      Open: '#3B82F6',
      PARTIAL: '#F59E0B',
      Partial: '#F59E0B',
      PAID: '#10B981',
      Paid: '#10B981',
      WRITTEN_OFF: '#EF4444',
      'Written Off': '#EF4444',
    };
    return colors[status] || '#6B7280';
  }

  hasNoAgingData(): boolean {
    if (!this.barChartData.datasets[0]?.data || this.barChartData.datasets[0].data.length === 0) {
      return true;
    }
    return this.barChartData.datasets[0].data.every((value) => value === 0);
  }

  toggleExportMenu() {
    this.showExportMenu = !this.showExportMenu;
  }

  closeExportMenu() {
    this.showExportMenu = false;
  }

  async generatePdf() {
    this.closeExportMenu();
    const element = document.getElementById('invoiceReportCharts');
    if (!element) {
      console.error('Invoice report charts not found.');
      return;
    }

    const filterSummary = element.querySelector('.pdf-filter-summary') as HTMLElement;
    if (filterSummary) {
      filterSummary.style.display = 'block';
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    if (filterSummary) {
      filterSummary.style.display = 'none';
    }

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

    const statusData = [
      ['Invoice Reports - Export'],
      ['Company Code:', this.getActiveCompanyCode() || 'N/A'],
      ['Generated On:', this.getCurrentDate()],
      ['Date Range:', this.getSelectedDateRangeLabel()],
      ['Status Period:', `${this.selectedMonths} Month(s)`],
      [],
      ['INVOICE STATUS BREAKDOWN'],
      ['Total Invoices:', this.totalInvoices],
      ['Status', 'Count', 'Percentage'],
      ...this.statusCounts.map((item) => [
        item.status,
        item.count,
        `${item.percentage.toFixed(1)}%`,
      ]),
    ];

    const agingLabels = this.barChartData.labels || [];
    const agingValues = this.barChartData.datasets[0]?.data || [];

    const agingData = [
      [],
      [],
      ['OVERDUE vs NOT DUE INVOICES'],
      ['Age Range', 'Count'],
      ...agingLabels.map((label, index) => [label, agingValues[index] || 0]),
    ];

    const combined = [...statusData, ...agingData];

    const ws = XLSX.utils.aoa_to_sheet(combined);

    // optional: set column widths
    ws['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Invoice Report');

    XLSX.writeFile(wb, this.getExportFileName('xlsx'));
  }

  exportToCSV() {
    this.closeExportMenu();

    const agingLabels = this.barChartData.labels || [];
    const agingValues = this.barChartData.datasets[0]?.data || [];

    const csvData = [
      ['Invoice Reports - Export'],
      ['Company Code:', this.getActiveCompanyCode() || 'N/A'],
      ['Generated On:', this.getCurrentDate()],
      ['Date Range:', this.getSelectedDateRangeLabel()],
      ['Status Period:', `${this.selectedMonths} Month(s)`],
      [],
      ['INVOICE STATUS BREAKDOWN'],
      ['Total Invoices:', this.totalInvoices],
      ['Status', 'Count', 'Percentage'],
      ...this.statusCounts.map((item) => [
        item.status,
        item.count,
        `${item.percentage.toFixed(1)}%`,
      ]),
      [],
      [],
      ['OVERDUE vs NOT DUE INVOICES'],
      ['Age Range', 'Count'],
      ...agingLabels.map((label, index) => [label, agingValues[index] || 0]),
    ];

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

  private formatExcelSheet(ws: XLSX.WorkSheet, rowCount: number, colCount: number) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    ws['!cols'] = [];
    for (let i = 0; i <= colCount; i++) {
      ws['!cols'].push({ wch: 20 });
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

      const headerRow = 5;
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
    const base = codeSegment ? `invoice-report-${codeSegment}` : 'invoice-report';
    return `${base}-${this.formatDateForFilename()}.${extension}`;
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

  private drawPdfMetadata(pdf: jsPDF): number {
    const lines = this.getExportMetadataLines();
    if (!lines.length) {
      return 0;
    }
    const margin = 10;
    const lineHeight = 6;
    pdf.setFontSize(10);
    let currentY = margin;
    lines.forEach((line) => {
      pdf.text(line, margin, currentY);
      currentY += lineHeight;
    });
    return currentY + 2;
  }

  private getExportMetadataLines(): string[] {
    return [`Company Code: ${this.getActiveCompanyCode() || 'N/A'}`];
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
          const code = response?.data?.companyCode?.trim();
          this.activeCompanyCode = code || null;
        },
        error: () => {
          if (this.activeCompanyId === companyId) {
            this.activeCompanyCode = null;
          }
        },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
