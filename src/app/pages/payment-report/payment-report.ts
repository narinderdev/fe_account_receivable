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
  paymentMethodCounts: PaymentMethodCount[] = [];
  totalPayments = 0;
  monthlyPayments: MonthlyPayment[] = [];
  selectedYear: number = new Date().getFullYear();
  selectedMonths: number = 6; // Default to 6 months for payment method filter

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;

  readonly yearOptions = this.generateYearOptions();
  readonly monthsOptions = [
    { label: '1 Month', value: 1 },
    { label: '3 Months', value: 3 },
    { label: '6 Months', value: 6 },
    { label: '12 Months', value: 12 },
  ];

  // Pie Chart Configuration
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

  constructor(
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService,
    private paymentReportService: PaymentReportService
  ) {}

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

  loadPaymentData(companyId: number, months: number) {
    this.pieChartLoading = true;
    this.cdr.detectChanges();

    this.paymentReportService.getPaymentMethodReport(companyId, months).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.data) {
          const data = response.data;
          this.totalPayments = data.totalPayments || 0;

          // Map methodCounts object to array
          const methodCounts = data.methodCounts || {};
          const total = this.totalPayments;

          this.paymentMethodCounts = Object.entries(methodCounts).map(([method, count]) => ({
            method: this.formatPaymentMethod(method),
            count: count as number,
            percentage: total > 0 ? ((count as number) / total) * 100 : 0,
          }));

          // Filter out methods with 0 count
          this.paymentMethodCounts = this.paymentMethodCounts.filter((p) => p.count > 0);

          // Update pie chart
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

          // Map monthly data
          this.monthlyPayments = data.map((item: any) => ({
            month: item.month,
            amount: item.totalAmount || 0,
          }));

          // Update bar chart
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
    // Convert BANK_TRANSFER to "Bank Transfer", CASH to "Cash", etc.
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
    if (!this.monthlyPayments || this.monthlyPayments.length === 0) {
      return true;
    }
    return this.monthlyPayments.every((payment) => payment.amount === 0);
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

    // Hide the filter summary again after capturing
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