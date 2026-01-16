import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Loader } from '../../shared/loader/loader';

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
  fromDate: string | null = null;
  toDate: string | null = null;
  paymentMethodCounts: PaymentMethodCount[] = [];
  totalPayments = 0;
  monthlyPayments: MonthlyPayment[] = [];
  selectedDateRange: string = 'LAST_1_MONTH';

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;

  readonly dateRangeOptions = [
    { label: 'Last 1 Month', value: 'LAST_1_MONTH' },
    { label: 'Last 2 Months', value: 'LAST_2_MONTHS' },
    { label: 'Last 3 Months', value: 'LAST_3_MONTHS' },
    { label: 'Last 6 Months', value: 'LAST_6_MONTHS' },
    { label: 'Last 12 Months', value: 'LAST_12_MONTHS' },
    { label: 'Custom Date', value: 'CUSTOM' },
  ];

  // Pie Chart Configuration
  pieChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
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
            const percentage =
              this.paymentMethodCounts.find((p) => p.method === label)?.percentage || 0;
            return `${label}: ${value} (${percentage.toFixed(1)}%)`;
          },
        },
      },
    },
    cutout: '65%',
  };

  // Bar Chart Configuration
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
            const value = context.parsed?.y ?? 0;
            return `Amount: $${value.toLocaleString()}`;
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
          callback: function (value) {
            return '$' + value.toLocaleString();
          },
        },
        grid: {
          color: '#F3F4F6',
        },
      },
    },
  };

  constructor(private cdr: ChangeDetectorRef, private companySelection: CompanySelectionService) {}

  ngOnInit() {
    // Initialize with static data for demo
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

        if (this.activeCompanyId) {
          // TODO: Load payment data when API is available
          // this.loadPaymentData(this.activeCompanyId);
        } else {
          this.resetState();
          this.cdr.detectChanges();
        }
      });
  }

  private resetState() {
    this.loading = false;
    this.fromDate = null;
    this.toDate = null;
    this.selectedDateRange = 'LAST_1_MONTH';
    // Keep static data visible even when no company is selected
    this.initializeStaticData();
  }

  private initializeStaticData() {
    // Static data for Payment Method Breakdown
    this.totalPayments = 6;
    this.paymentMethodCounts = [
      { method: 'Cash', count: 3, percentage: 50.0 },
      { method: 'Bank Transfer', count: 2, percentage: 33.3 },
      { method: 'Credit Card', count: 1, percentage: 16.7 },
    ];

    // Update pie chart with static data
    this.pieChartData.labels = this.paymentMethodCounts.map((p) => p.method);
    this.pieChartData.datasets[0].data = this.paymentMethodCounts.map((p) => p.count);

    // Static data for Payments Collected Over Time
    this.monthlyPayments = [
      { month: 'January', amount: 300 },
      { month: 'February', amount: 0 },
      { month: 'March', amount: 220 },
      { month: 'April', amount: 1010 },
    ];

    // Update bar chart with static data
    this.barChartData.labels = this.monthlyPayments.map((item) => item.month);
    this.barChartData.datasets[0].data = this.monthlyPayments.map((item) => item.amount);
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
      // Keep current fromDate and toDate values
      return;
    }

    // Calculate date range based on selection
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
    // TODO: Load payment data when API is available
    // this.loadPaymentData(this.activeCompanyId);
  }

  formatDate(date: string | null | undefined) {
    if (!date) {
      return '';
    }
    return new Date(date).toLocaleDateString('en-US');
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
      WRITTEN_OFF: '#EF4444',
    };
    return colors[method] || '#6B7280';
  }

  async generatePdf() {
    const element = document.getElementById('paymentReportCharts');
    if (!element) {
      console.error('Payment report charts not found.');
      return;
    }

    // Temporarily show the filter summary for PDF generation
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

    pdf.save('payment-report-charts.pdf');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
