import {
  Component,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID,
  AfterViewInit,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';

import { CurrencyPipe, NgIf, isPlatformBrowser } from '@angular/common';
import Chart from 'chart.js/auto';
import { DashboardService } from '../../services/dashboard-service';
import { Loader } from '../../shared/loader/loader';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, CurrencyPipe, Loader],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit, AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  isBrowser = false;
  chart!: Chart;
  loadingSummary = false;

  dashboardData = {
    totalReceivables: 0,
    currentReceivables: 0,
    totalPaymentReceived: 0,
    todayPaymentReceived: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    totalCustomers: 0,
    currentPromiseToPay: 0,
  };

  constructor(
    @Inject(PLATFORM_ID) platformId: any,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /* =========================
     INIT
  ========================= */
  ngOnInit(): void {
    this.loadDashboardSummary();
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;

    requestAnimationFrame(() => {
      this.initChart();
    });
  }

  /* =========================
     API CALL
  ========================= */
  loadDashboardSummary(): void {
    this.loadingSummary = true;
    this.cdr.detectChanges();

    this.dashboardService.getDashboardCardData().subscribe({
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

        this.loadingSummary = false;
        this.cdr.detectChanges(); // ✅ important
      },
      error: (err) => {
        console.error('Dashboard summary error:', err);
        this.loadingSummary = false;
        this.cdr.detectChanges();
      },
    });
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
        labels: ['Jan', 'Feb', 'March', 'April', 'May', 'June'],
        datasets: [
          {
            data: [80, 200, 150, 70, 40, 90],
            borderColor: '#3599FF',
            backgroundColor: 'transparent',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#3599FF',
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: '#E5E7EB' } },
          x: { grid: { display: false } },
        },
      },
    });
  }
}
