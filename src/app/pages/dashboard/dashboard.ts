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
} from '@angular/core';

import { CurrencyPipe, NgIf, isPlatformBrowser } from '@angular/common';
import Chart from 'chart.js/auto';
import { ScriptableContext, TooltipItem } from 'chart.js';
import { DashboardService } from '../../services/dashboard-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { DashboardSummaryData, DashboardGraphResponse } from '../../models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, CurrencyPipe],
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
  };

  // Graph data properties
  graphLabels: string[] = [];
  graphData: number[] = [];
  loadingGraph = false;

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
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
        this.loadGraphData(this.activeCompanyId);
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
        };
        // Show last 12 months at zero when no company selected
        this.graphLabels = this.generateLast12Months();
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
    });
  }

  /* =========================
     API CALLS
  ========================= */
  loadDashboardSummary(companyId: number): void {
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
          };
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Dashboard summary error:', err);
      },
    });
  }

  // Load graph data from API
  loadGraphData(companyId: number): void {
    this.loadingGraph = true;

    this.dashboardService.getDashboardGraphData(companyId).subscribe({
      next: (res: DashboardGraphResponse) => {
        const series = res?.data?.series;

        if (series && Array.isArray(series) && series.length > 0) {
          // Convert month format from "YYYY-MM" to readable format
          this.graphLabels = series.map((item) => this.formatMonth(item.month));
          this.graphData = series.map((item) => item.balance);
        } else {
          // Show empty state with last 12 months at zero
          this.graphLabels = this.generateLast12Months();
          this.graphData = Array(12).fill(0);
        }

        this.loadingGraph = false;
        this.updateChart();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Graph data error:', err);
        // Show empty state on error too
        this.graphLabels = this.generateLast12Months();
        this.graphData = Array(12).fill(0);
        this.loadingGraph = false;
        this.updateChart();
        this.cdr.detectChanges();
      },
    });
  }

  // Generate last 12 months labels for empty state
  generateLast12Months(): string[] {
    const months: string[] = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      months.push(this.formatMonth(`${year}-${month}`));
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
      type: 'line',
      data: {
        labels: this.graphLabels,
        datasets: [
          {
            data: this.graphData,
            borderColor: '#3b82f6',
            backgroundColor: (context: ScriptableContext<'line'>) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, 400);
              gradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
              gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');
              return gradient;
            },
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: '#3b82f6',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            fill: true,
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
              label: (context: TooltipItem<'line'>) => {
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

    this.chart.update();
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
