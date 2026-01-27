import {
  Component,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID,
  AfterViewInit,
  OnInit,
  ChangeDetectorRef,
  OnDestroy,
  NgZone,
} from '@angular/core';

import { CurrencyPipe, NgIf, NgFor, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { ScriptableContext, TooltipItem } from 'chart.js';
import { DashboardService } from '../../services/dashboard-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { DashboardSummaryData, DashboardInvoiceResponse } from '../../models/dashboard.model';
import { Loader } from 'src/app/shared/loader/loader';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, NgFor, CurrencyPipe, FormsModule, Loader],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  isBrowser = false;
  chart: Chart | null = null;

  dashboardData: DashboardSummaryData = {
    totalReceivables: 0,
    currentReceivables: 0,
    totalPaymentReceived: 0,
    todayPaymentReceived: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    totalCustomers: 0,
    currentPromiseToPay: 0,
    overdueMoreThan30Days:0
  };

  // Graph data properties
  graphLabels: string[] = [];
  graphData: number[] = [];
  loadingGraph = false;
  loadingSummary = false;

  // Year selector
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  private graphReqSeq = 0;

  // Computed property to show loader
  get isLoading(): boolean {
    return this.loadingSummary || this.loadingGraph;
  }

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService,
    private ngZone: NgZone,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initializeYearOptions();
  }

  /* =========================
     INIT
  ========================= */
  ngOnInit(): void {
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      const parsed = id ? Number(id) : NaN;
      const nextId = Number.isFinite(parsed) ? parsed : null;

      if (this.activeCompanyId === nextId) {
        return;
      }

      this.activeCompanyId = nextId;

      if (this.activeCompanyId) {
        this.loadDashboardSummary(this.activeCompanyId);
        this.loadGraphData(this.activeCompanyId, this.selectedYear);
      } else {
        this.dashboardData = {
          totalReceivables: 0,
          currentReceivables: 0,
          totalPaymentReceived: 0,
          todayPaymentReceived: 0,
          totalInvoices: 0,
          pendingInvoices: 0,
          totalCustomers: 0,
          currentPromiseToPay: 0,
          overdueMoreThan30Days:0
        };
        // Show all 12 months at zero when no company selected
        this.graphLabels = this.generateMonthLabels(this.selectedYear);
        this.graphData = Array(12).fill(0);
        this.updateChart();
        this.cdr.detectChanges();
      }
    });
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;

    requestAnimationFrame(() => {
      this.initChart();
      // If data was loaded before chart init, update it now
      if (this.graphLabels.length > 0 && this.chart) {
        this.updateChart();
      }
    });
  }

  /* =========================
     YEAR SELECTION
  ========================= */
  initializeYearOptions(): void {
    const currentYear = new Date().getFullYear();
    const startYear = 2024;

    this.availableYears = [];
    for (let year = startYear; year <= currentYear; year++) {
      this.availableYears.push(year);
    }
  }

  onYearChange(): void {
    this.selectedYear = Number(this.selectedYear);
    if (this.activeCompanyId) {
      this.loadGraphData(this.activeCompanyId, this.selectedYear);
    }
  }

  /* =========================
     API CALLS
  ========================= */
  loadDashboardSummary(companyId: number): void {
    this.loadingSummary = true;

    this.dashboardService.getDashboardCardData(companyId).subscribe({
      next: (res) => {
        const data = res?.data;

        if (data) {
          this.dashboardData = {
            totalReceivables: data.totalReceivables ?? 0,
            currentReceivables: data.currentReceivables ?? 0,
            totalPaymentReceived: data.totalPaymentReceived ?? 0,
            todayPaymentReceived: data.todayPaymentReceived ?? 0,
            totalInvoices: data.totalInvoices ?? 0,
            pendingInvoices: data.pendingInvoices ?? 0,
            totalCustomers: data.totalCustomers ?? 0,
            currentPromiseToPay: data.currentPromiseToPay ?? 0,
            overdueMoreThan30Days: data.overdueMoreThan30Days ?? 0
          };
        }

        this.loadingSummary = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Dashboard summary error:', err);
        this.loadingSummary = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Load graph data from API
  loadGraphData(companyId: number, year: number): void {
    year = Number(year);
    const reqId = ++this.graphReqSeq;

    this.loadingGraph = true;
    this.dashboardService.getDashboardInvoiceData(companyId, year).subscribe({
      next: (res) => {
        if (reqId !== this.graphReqSeq) return;
        console.log('YEAR requested:', year, 'YEAR from dropdown:', this.selectedYear);
        console.log('First point:', res?.data?.points?.[0]?.yearMonth);

        const points = res?.data?.points;

        const tempLabels = this.generateMonthLabels(year);
        const tempData = Array(12).fill(0);

        if (Array.isArray(points)) {
          points.forEach((item) => {
            const [itemYear, itemMonth] = item.yearMonth.split('-');
            const monthIndex = Number(itemMonth) - 1;

            if (Number(itemYear) === year && monthIndex >= 0 && monthIndex < 12) {
              tempData[monthIndex] = item.totalAmount;
            }
          });
        }

        this.graphLabels = tempLabels;
        this.graphData = tempData;

        this.loadingGraph = false;
        this.updateChart();
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (reqId !== this.graphReqSeq) return;

        this.graphLabels = this.generateMonthLabels(year);
        this.graphData = Array(12).fill(0);

        this.loadingGraph = false;
        this.updateChart();
        this.cdr.detectChanges();
      },
    });
  }

  // Generate month labels for a given year
  generateMonthLabels(year: number): string[] {
    const months: string[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, '0');
      months.push(this.formatMonth(`${year}-${monthStr}`));
    }

    return months;
  }

  // Format month from "2025-01" to "Jan 2025"
  formatMonth(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  }

  /* =========================
     CHART
  ========================= */
  initChart() {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) return;

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.graphLabels,
        datasets: [
          {
            data: this.graphData,
            backgroundColor: (context: ScriptableContext<'bar'>) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, 400);
              gradient.addColorStop(0, '#2563eb');
              gradient.addColorStop(1, '#1d4ed8');
              return gradient;
            },
            borderColor: '#1e40af',
            borderWidth: 0,
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: '#1e3a8a',
            barThickness: 'flex',
            maxBarThickness: 60,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            padding: 12,
            borderColor: '#374151',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: (context: TooltipItem<'bar'>) => {
                const value = context.parsed.y;
                return value !== null
                  ? `$${value.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : '$0.00';
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            // Dynamic Y-axis based on data
            suggestedMax: this.calculateSuggestedMax(this.graphData),
            grid: {
              color: '#e5e7eb',
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 12,
              },
              callback: (value) => `$${Number(value).toLocaleString()}`,
            },
            border: {
              display: false,
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 12,
              },
              // Auto-skip labels if too many months
              maxRotation: 45,
              minRotation: 0,
            },
            border: {
              display: false,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      },
    });
  }

  updateChart() {
    if (!this.chart) return;

    this.chart.data.labels = this.graphLabels;
    this.chart.data.datasets[0].data = this.graphData;

    if (this.chart.options.scales && this.chart.options.scales['y']) {
      this.chart.options.scales['y'].suggestedMax = this.calculateSuggestedMax(this.graphData);
    }

    this.chart.update(); // single update
  }

  calculateSuggestedMax(data: number[]): number {
    if (!data || data.length === 0) return 100;
    const max = Math.max(...data);
    // If all values are 0, return 100 for better visualization
    if (max === 0) return 100;
    return Math.ceil(max * 1.2);
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}