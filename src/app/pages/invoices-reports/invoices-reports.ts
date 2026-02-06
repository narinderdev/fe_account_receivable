import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Invoice, InvoicePage } from '../../models/invoice.model';
import { CompanySelectionService } from '../../services/company-selection.service';
import { InvoiceService } from '../../services/invoice-service';
import { UserContextService } from '../../services/user-context.service';
import { Loader } from '../../shared/loader/loader';

@Component({
  selector: 'app-invoices-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './invoices-reports.html',
  styleUrl: './invoices-reports.css',
})
export class InvoicesReports implements OnInit, OnDestroy {
  invoices: Invoice[] = [];
  allInvoices: Invoice[] = [];
  searchName = '';
  loading = false;
  statusOptions = ['OPEN', 'PARTIAL', 'PAID', 'WRITTEN_OFF'];
  selectedStatuses: string[] = ['OPEN', 'PARTIAL'];
  tempSelectedStatuses: string[] = ['OPEN', 'PARTIAL'];
  isStatusDropdownOpen = false;
  fromDate: string | null = null;
  toDate: string | null = null;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalItems = 0;
  Math = Math;
  private destroy$ = new Subject<void>();
  private activeCompanyId: number | null = null;
  canCreateInvoice = false;

  constructor(
    private invoiceService: InvoiceService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private companySelection: CompanySelectionService,
    private userContext: UserContextService
  ) {
    this.canCreateInvoice = this.userContext.hasPermission('CREATE_INVOICE');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.filter-field');
    
    if (!dropdown && this.isStatusDropdownOpen) {
      this.isStatusDropdownOpen = false;
      this.tempSelectedStatuses = [...this.selectedStatuses];
      this.cdr.detectChanges();
    }
  }

  ngOnInit() {
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
          this.loadInvoices(this.activeCompanyId, 0);
        } else {
          this.resetState();
          this.cdr.detectChanges();
        }
      });
  }

  private resetState() {
    this.invoices = [];
    this.allInvoices = [];
    this.searchName = '';
    this.loading = false;
    this.currentPage = 0;
    this.totalPages = 0;
    this.totalItems = 0;
    this.selectedStatuses = ['OPEN', 'PARTIAL'];
    this.tempSelectedStatuses = ['OPEN', 'PARTIAL'];
    this.isStatusDropdownOpen = false;
    this.fromDate = null;
    this.toDate = null;
  }

  toggleStatusDropdown() {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
    if (this.isStatusDropdownOpen) {
      this.tempSelectedStatuses = [...this.selectedStatuses];
    }
  }

  toggleStatusSelection(status: string) {
    const index = this.tempSelectedStatuses.indexOf(status);
    if (index > -1) {
      this.tempSelectedStatuses.splice(index, 1);
    } else {
      this.tempSelectedStatuses.push(status);
    }
  }

  isStatusSelected(status: string): boolean {
    return this.tempSelectedStatuses.includes(status);
  }

  clearStatusSelection() {
    this.tempSelectedStatuses = [];
  }

  applyStatusFilter() {
    this.selectedStatuses = [...this.tempSelectedStatuses];
    this.isStatusDropdownOpen = false;
    this.reloadWithFilters();
  }

  getStatusDisplayText(): string {
    if (this.tempSelectedStatuses.length === 0) {
      return 'Select status';
    }
    if (this.tempSelectedStatuses.length === 1) {
      return this.tempSelectedStatuses[0];
    }
    if (this.tempSelectedStatuses.length === this.statusOptions.length) {
      return 'All statuses';
    }
    return `${this.tempSelectedStatuses.length} selected`;
  }

  loadInvoices(companyId: number, page: number) {
    this.loading = true;
    this.cdr.detectChanges();

    const filters = {
      statuses: this.selectedStatuses.length ? this.selectedStatuses : undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      page,
      size: this.pageSize,
    };

    this.invoiceService.getFilteredInvoices(companyId, filters).subscribe({
      next: (response: InvoicePage) => {
        const pageData = response?.data;
        this.invoices = pageData?.content ?? [];
        this.allInvoices = [...this.invoices];
        this.totalPages = pageData?.totalPages ?? 0;
        this.currentPage = pageData?.number ?? 0;
        this.totalItems = pageData?.totalElements ?? this.allInvoices.length;
        this.loading = false;
        this.applySearchFilter();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearchChange() {
    this.applySearchFilter();
  }

  private applySearchFilter() {
    const term = this.searchName.trim().toLowerCase();
    if (term.length < 3) {
      this.invoices = [...this.allInvoices];
      return;
    }

    this.invoices = this.allInvoices.filter((invoice) => {
      const name = invoice.customer?.customerName?.toLowerCase() || '';
      return name.includes(term);
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

    return palette[index % palette.length];
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const current = this.currentPage + 1;
    const total = this.totalPages;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (current <= 3) {
      pages.push(2, 3, 4, -1, total);
    } else if (current >= total - 2) {
      pages.push(-1, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(-1, current - 1, current, current + 1, -1, total);
    }

    return pages;
  }

  goToPage(page: number) {
    if (this.activeCompanyId && page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.loadInvoices(this.activeCompanyId, page);
    }
  }

  nextPage() {
    if (this.activeCompanyId && this.currentPage < this.totalPages - 1) {
      this.loadInvoices(this.activeCompanyId, this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.activeCompanyId && this.currentPage > 0) {
      this.loadInvoices(this.activeCompanyId, this.currentPage - 1);
    }
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
      minute: '2-digit'
    });
  }

  openInvoice(invoiceId: number) {
    this.router.navigate(['/admin/invoices/detail', invoiceId]);
  }

  handleFromDateChange(value: string) {
    this.fromDate = value || null;
    this.reloadWithFilters();
  }

  handleToDateChange(value: string) {
    this.toDate = value || null;
    this.reloadWithFilters();
  }

  private reloadWithFilters() {
    if (!this.activeCompanyId) {
      return;
    }
    this.currentPage = 0;
    this.loadInvoices(this.activeCompanyId, 0);
  }

  async generatePdf() {
    const element = document.getElementById('invoiceReportsTable');
    if (!element) {
      console.error('Invoice reports table not found.');
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

    pdf.save('invoice-reports.pdf');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
