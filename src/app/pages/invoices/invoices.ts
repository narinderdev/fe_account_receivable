import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice-service';
import { Loader } from '../../shared/loader/loader';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Invoice, InvoicePage } from '../../models/invoice.model';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [RouterLink, CommonModule, Loader, FormsModule],
  templateUrl: './invoices.html',
  styleUrl: './invoices.css',
})
export class Invoices implements OnInit, OnDestroy {
  invoices: Invoice[] = [];
  allInvoices: Invoice[] = [];
  searchName: string = '';
  loading = false;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
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
          this.loadInvoices(this.activeCompanyId, this.currentPage);
        } else {
          this.invoices = [];
          this.allInvoices = [];
          this.totalPages = 0;
          this.currentPage = 0;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadInvoices(companyId: number, page: number): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.invoiceService.getInvoices(companyId, page, this.pageSize).subscribe({
      next: (res: InvoicePage) => {
        const pageData = res?.data;

        this.invoices = pageData?.content || [];
        this.allInvoices = [...this.invoices];

        this.totalPages = pageData?.totalPages || 0;
        this.currentPage = pageData?.number || 0;

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Invoice load error:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
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

    const colorIndex = index % palette.length;
    return palette[colorIndex];
  }

  onSearchChange(): void {
    const term = this.searchName.trim().toLowerCase();

    if (term.length < 3) {
      this.invoices = [...this.allInvoices];
      return;
    }

    this.invoices = this.allInvoices.filter((inv) =>
      inv.customer.customerName.toLowerCase().includes(term)
    );
  }

  /**
   * Generate page numbers for pagination
   * Shows: 1 ... 3 4 5 ... 8 (example for page 4 of 8)
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const current = this.currentPage + 1; // Convert to 1-based
    const total = this.totalPages;

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current <= 3) {
        // Near the beginning
        pages.push(2, 3, 4, -1, total);
      } else if (current >= total - 2) {
        // Near the end
        pages.push(-1, total - 3, total - 2, total - 1, total);
      } else {
        // In the middle
        pages.push(-1, current - 1, current, current + 1, -1, total);
      }
    }

    return pages;
  }

  goToPage(page: number): void {
    if (
      this.activeCompanyId &&
      page >= 0 &&
      page < this.totalPages &&
      page !== this.currentPage
    ) {
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

  formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US');
  }

  getStatus(invoice: Invoice) {
    return invoice.status === 'PAID' ? 'Paid' : 'Due';
  }

  openInvoice(invoiceId: number) {
    this.router.navigate(['/admin/invoices/detail', invoiceId]);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
