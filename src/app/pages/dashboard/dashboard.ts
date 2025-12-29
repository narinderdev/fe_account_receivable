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

  // ✅ Graph data properties
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
        this.graphLabels = [];
        this.graphData = [];
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

  // ✅ Load graph data from API
  loadGraphData(companyId: number): void {
    this.loadingGraph = true;

    this.dashboardService.getDashboardGraphData(companyId).subscribe({
      next: (res: DashboardGraphResponse) => {
        const series = res?.data?.series;

        if (series && Array.isArray(series)) {
          // Convert month format from "YYYY-MM" to readable format
          this.graphLabels = series.map((item) => this.formatMonth(item.month));
          this.graphData = series.map((item) => item.balance);
        } else {
          this.graphLabels = [];
          this.graphData = [];
        }

        this.loadingGraph = false;
        this.updateChart();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Graph data error:', err);
        this.graphLabels = [];
        this.graphData = [];
        this.loadingGraph = false;
        this.updateChart();
        this.cdr.detectChanges();
      },
    });
  }

  // ✅ Format month from "2025-01" to "Jan 2025"
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
            // ✅ Dynamic Y-axis based on data
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
              // ✅ Auto-skip labels if too many months
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

  // ✅ Update chart with new data
  updateChart() {
    if (!this.chart) return;

    this.chart.data.labels = this.graphLabels;
    this.chart.data.datasets[0].data = this.graphData;

    // ✅ Use bracket notation for index signature
    if (this.chart.options.scales && this.chart.options.scales['y']) {
      this.chart.options.scales['y'].suggestedMax = this.calculateSuggestedMax(this.graphData);
    }

    this.chart.update();
  }

  // ✅ Calculate suggested max for Y-axis (add 20% padding)
  calculateSuggestedMax(data: number[]): number {
    if (!data || data.length === 0) return 100;
    const max = Math.max(...data);
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
