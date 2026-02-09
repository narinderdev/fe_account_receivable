import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { CompanySelectionService } from '../../services/company-selection.service';
import { CompanyService } from '../../services/company-service';
import { Loader } from '../../shared/loader/loader';
import { PaymentReportService } from 'src/app/services/payment-report-service';

interface PaymentMethodCount {
  method: string;
  count: number;
  percentage: number;
}

interface MonthlyPayment {
  month: string;
  amount: number;
}

@Component({
  selector: 'app-payment-report',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader, BaseChartDirective],
  templateUrl: './payment-report.html',
  styleUrl: './payment-report.css',
})
export class PaymentReport implements OnInit, OnDestroy {
  loading = false;
  pieChartLoading = false;
  barChartLoading = false;
  showExportMenu = false;

  paymentMethodCounts: PaymentMethodCount[] = [];
  totalPayments = 0;

  monthlyPayments: MonthlyPayment[] = [];
  selectedYear: number = new Date().getFullYear();
  selectedMonths: number = 6;

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  private activeCompanyCode: string | null = null;

  readonly yearOptions = this.generateYearOptions();
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
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
        borderWidth: 0,
      },
    ],
  };

  pieChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage =
              this.paymentMethodCounts.find((p) => p.method === label)?.percentage || 0;
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
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed?.y ?? 0;
            return `Amount: $${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return '$' + value.toLocaleString();
          },
        },
        grid: { color: '#F3F4F6' },
      },
    },
  };

  constructor(
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService,
    private paymentReportService: PaymentReportService,
    private companyService: CompanyService,
  ) {}

  ngOnInit() {
    this.initializeStaticData();

    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((companyIdValue) => {
        const parsed = companyIdValue ? Number(companyIdValue) : NaN;
        const nextCompanyId = Number.isFinite(parsed) ? parsed : null;

        if (this.activeCompanyId === nextCompanyId) return;

        this.activeCompanyId = nextCompanyId;
        this.activeCompanyCode = null;

        if (this.activeCompanyId) {
          this.loadCompanyMetadata(this.activeCompanyId);
          this.loadPaymentData(this.activeCompanyId, this.selectedMonths);
          this.loadMonthlyPaymentData(this.activeCompanyId, this.selectedYear);
        } else {
          this.resetState();
          this.cdr.detectChanges();
        }
      });
  }

  private generateYearOptions() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push({ label: `${currentYear - i}`, value: currentYear - i });
    }
    return years;
  }

  private resetState() {
    this.loading = false;
    this.pieChartLoading = false;
    this.barChartLoading = false;
    this.selectedYear = new Date().getFullYear();
    this.selectedMonths = 6;
    this.activeCompanyCode = null;
    this.initializeStaticData();
  }

  private initializeStaticData() {
    this.totalPayments = 6;
    this.paymentMethodCounts = [
      { method: 'Cash', count: 3, percentage: 50.0 },
      { method: 'Bank Transfer', count: 2, percentage: 33.3 },
      { method: 'Credit Card', count: 1, percentage: 16.7 },
    ];

    this.pieChartData.labels = this.paymentMethodCounts.map((p) => p.method);
    this.pieChartData.datasets[0].data = this.paymentMethodCounts.map((p) => p.count);

    this.monthlyPayments = [
      { month: 'January', amount: 300 },
      { month: 'February', amount: 0 },
      { month: 'March', amount: 220 },
      { month: 'April', amount: 1010 },
    ];

    this.barChartData.labels = this.monthlyPayments.map((item) => item.month);
    this.barChartData.datasets[0].data = this.monthlyPayments.map((item) => item.amount);
  }

  loadPaymentData(companyId: number, months: number) {
    this.pieChartLoading = true;
    this.cdr.detectChanges();

    this.paymentReportService.getPaymentMethodReport(companyId, months).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.data) {
          const data = response.data;
          this.totalPayments = data.totalPayments || 0;

          const methodCounts = data.methodCounts || {};
          const total = this.totalPayments;

          this.paymentMethodCounts = Object.entries(methodCounts).map(([method, count]) => ({
            method: this.formatPaymentMethod(method),
            count: count as number,
            percentage: total > 0 ? ((count as number) / total) * 100 : 0,
          }));

          this.paymentMethodCounts = this.paymentMethodCounts.filter((p) => p.count > 0);

          this.pieChartData.labels = this.paymentMethodCounts.map((p) => p.method);
          this.pieChartData.datasets[0].data = this.paymentMethodCounts.map((p) => p.count);

          this.cdr.detectChanges();
        }
        this.pieChartLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading payment method report:', error);
        this.pieChartLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadMonthlyPaymentData(companyId: number, year: number) {
    this.barChartLoading = true;
    this.cdr.detectChanges();

    this.paymentReportService.getMonthlyPaymentReport(companyId, year).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.data) {
          const data = response.data;

          this.monthlyPayments = data.map((item: any) => ({
            month: item.month,
            amount: item.totalAmount || 0,
          }));

          // ✅ Ensure chart is always updated from API data
          this.barChartData.labels = this.monthlyPayments.map((item) => item.month);
          this.barChartData.datasets[0].data = this.monthlyPayments.map((item) => item.amount);

          this.cdr.detectChanges();
        }
        this.barChartLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading monthly payment report:', error);
        this.barChartLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  handleYearChange(year: number) {
    this.selectedYear = year;
    if (this.activeCompanyId) {
      this.loadMonthlyPaymentData(this.activeCompanyId, year);
    }
  }

  handleMonthsChange(months: number) {
    this.selectedMonths = months;
    if (this.activeCompanyId) {
      this.loadPaymentData(this.activeCompanyId, months);
    }
  }

  private formatPaymentMethod(method: string): string {
    return method
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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

  getPaymentMethodColor(method: string): string {
    const colors: Record<string, string> = {
      Cash: '#10B981',
      'Bank Transfer': '#3B82F6',
      'Credit Card': '#F59E0B',
      Check: '#EF4444',
      'Wire Transfer': '#8B5CF6',
      Other: '#EC4899',
    };
    return colors[method] || '#6B7280';
  }

  hasNoMonthlyData(): boolean {
    if (!this.monthlyPayments || this.monthlyPayments.length === 0) return true;
    return this.monthlyPayments.every((payment) => payment.amount === 0);
  }

  toggleExportMenu() {
    this.showExportMenu = !this.showExportMenu;
  }

  closeExportMenu() {
    this.showExportMenu = false;
  }

  async generatePdf() {
    this.closeExportMenu();
    const element = document.getElementById('paymentReportCharts');
    if (!element) {
      console.error('Payment report charts not found.');
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

    // Sheet 1: Payment Method Breakdown
    const methodData = [
      ['Payment Method Breakdown'],
      ['Company Code:', this.getActiveCompanyCode() || 'N/A'],
      ['Generated On:', this.getCurrentDate()],
      ['Payment Method Period:', `${this.selectedMonths} Month(s)`],
      ['Total Payments:', this.totalPayments],
      [],
      ['Payment Method', 'Count', 'Percentage'],
      ...this.paymentMethodCounts.map((item) => [
        item.method,
        item.count,
        `${item.percentage.toFixed(1)}%`,
      ]),
    ];

    const wsMethod = XLSX.utils.aoa_to_sheet(methodData);
    this.formatExcelSheet(wsMethod, methodData.length, 3);
    XLSX.utils.book_append_sheet(wb, wsMethod, 'Payment Methods');

    // Sheet 2: Payments Collected Over Time
    const labelsFromChart = (this.barChartData.labels || []) as string[];
    const valuesFromChart = (this.barChartData.datasets?.[0]?.data || []) as number[];

    const finalMonthlyRows: Array<[string, number]> =
      this.monthlyPayments?.length > 0
        ? this.monthlyPayments.map((m) => [m.month, m.amount || 0])
        : labelsFromChart.length > 0
          ? labelsFromChart.map((label, i) => [label, Number(valuesFromChart[i] ?? 0)])
          : [];

    const monthlyData = [
      ['Payments Collected Over Time'],
      ['Company Code:', this.getActiveCompanyCode() || 'N/A'],
      ['Generated On:', this.getCurrentDate()],
      ['Year:', this.selectedYear],
      [],
      ['Month', 'Amount'],
      ...finalMonthlyRows,
    ];

    const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyData);
    this.formatExcelSheet(wsMonthly, monthlyData.length, 2);
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Payments');

    XLSX.writeFile(wb, this.getExportFileName('xlsx'));
  }

  exportToCSV() {
    this.closeExportMenu();

    const labelsFromChart = (this.barChartData.labels || []) as string[];
    const valuesFromChart = (this.barChartData.datasets?.[0]?.data || []) as number[];

    const finalMonthlyRows: Array<[string, number]> =
      this.monthlyPayments?.length > 0
        ? this.monthlyPayments.map((m) => [m.month, m.amount || 0])
        : labelsFromChart.length > 0
          ? labelsFromChart.map((label, i) => [label, Number(valuesFromChart[i] ?? 0)])
          : [];

    const csvData = [
      ['Payment Reports - Export'],
      ['Company Code:', this.getActiveCompanyCode() || 'N/A'],
      ['Generated On:', this.getCurrentDate()],
      ['Payment Method Period:', `${this.selectedMonths} Month(s)`],
      ['Year:', this.selectedYear],
      [],
      ['PAYMENT METHOD BREAKDOWN'],
      ['Total Payments:', this.totalPayments],
      ['Payment Method', 'Count', 'Percentage'],
      ...this.paymentMethodCounts.map((item) => [
        item.method,
        item.count,
        `${item.percentage.toFixed(1)}%`,
      ]),
      [],
      [],
      ['PAYMENTS COLLECTED OVER TIME'],
      ['Month', 'Amount'],
      ...finalMonthlyRows,
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
    const base = codeSegment ? `payment-report-${codeSegment}` : 'payment-report';
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
