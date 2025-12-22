import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgingService } from '../../services/aging-service';
import { Customer } from '../../services/customer';
import { Loader } from '../../shared/loader/loader';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';

interface AgingRow {
  customer: string;
  totalDue: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days90plus: number;
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

  customers: any[] = [{ label: 'All Customers', value: '' }];

  statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Partial', value: 'PARTIAL' },
  ];

  selectedCustomer = '';
  selectedStatus = '';
  agingData: AgingRow[] = [];

  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;

  constructor(
    private agingService: AgingService,
    private customerService: Customer,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService
  ) {}

  ngOnInit() {
    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
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
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /** GET INITIAL COLOR BASED ON FIRST LETTER */
  getInitialColor(customerName: string): { background: string; color: string } {
    const initial = customerName[0]?.toUpperCase() || '';
    const palette: Record<string, { background: string; color: string }> = {
      A: { background: '#DBEAFE', color: '#2563EB' },
      G: { background: '#F3E8FF', color: '#9333EA' },
      S: { background: '#FFEDD5', color: '#EA580C' },
      U: { background: '#FEE2E2', color: '#DC2626' },
      C: { background: '#E0E7FF', color: '#4F46E5' },
      I: { background: '#CCFBF1', color: '#0D9488' },
      W: { background: '#FEF3C7', color: '#D97706' },
    };
    return (
      palette[initial] || {
        background: '#F3F4F6',
        color: '#1F2937',
      }
    );
  }

  /** LOAD CUSTOMERS INTO DROPDOWN */
  loadCustomers(companyId: number) {
    this.loading = true;
    this.cdr.detectChanges();

    this.customerService.getCustomers(companyId, 0, 50).subscribe({
      next: (res: any) => {
        const content = res.data?.content || [];

        this.customers = [
          { label: 'All Customers', value: '' },
          ...content.map((c: any) => ({
            label: c.customerName,
            value: c.id,
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

  /** INITIAL LOAD */
  loadAgingData(companyId: number) {
    this.loading = true;
    this.cdr.detectChanges();

    this.agingService.getAging(companyId).subscribe({
      next: (res) => {
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

  /** AUTO CALL WHEN CUSTOMER SELECTED */
  onCustomerChange() {
    this.loading = true;
    this.cdr.detectChanges();

    this.fetchWithFilters();
  }

  /** AUTO CALL WHEN STATUS SELECTED */
  onStatusChange() {
    this.loading = true;
    this.cdr.detectChanges();

    this.fetchWithFilters();
  }

  /** APPLY FILTERS WHEN CLICKING PDF */
  async generatePdf() {
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

  private fetchWithFilters() {
    const filters: any = {};

    if (this.selectedCustomer) filters.customerId = Number(this.selectedCustomer);
    if (this.selectedStatus) filters.status = this.selectedStatus;

    if (!this.activeCompanyId) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.agingService.getAging(this.activeCompanyId, filters).subscribe({
      next: (res) => {
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

  private mapResponse(res: any) {
    const rows = res.data?.rows || [];

    this.agingData = rows.map((r: any) => ({
      customer: r.customerName,
      totalDue: r.totalDue,
      current: r.current,
      days1to30: r.bucket1To30,
      days31to60: r.bucket31To60,
      days90plus: r.bucketGt90,
    }));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
