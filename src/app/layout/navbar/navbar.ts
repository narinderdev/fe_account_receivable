import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { CompanyService } from '../../services/company-service';
import { CompanyEntity } from '../../models/company.model';
import { CompanySelectionService } from '../../services/company-selection.service';
import { MonthEndService } from '../../services/month-end-service';
import { ChangeDetectorRef } from '@angular/core';

type TitleRule = {
  prefix: string;
  title: string;
};

const TITLE_RULES: TitleRule[] = [
  { prefix: '/admin/invoices-reports', title: 'Invoice Report' },
  { prefix: '/admin/payment-reports', title: 'Payment Report' },
  { prefix: '/admin/ar-company/add', title: 'Add AR Company' },
  { prefix: '/admin/ar-company/edit', title: 'Edit AR Company' },
  { prefix: '/admin/ar-company/details', title: 'AR Company Detail' },
  { prefix: '/admin/ar-company/onboarding-complete', title: 'Onboarding Complete' },
  { prefix: '/admin/ar-company', title: 'AR Company' },
  { prefix: '/admin/customer/add', title: 'Add Customer' },
  { prefix: '/admin/customer/edit', title: 'Edit Customer' },
  { prefix: '/admin/customer/', title: 'Customer Detail' },
  { prefix: '/admin/customer', title: 'Customer' },
  { prefix: '/admin/invoices/create', title: 'Create Invoice' },
  { prefix: '/admin/invoices/detail', title: 'Invoice Detail' },
  { prefix: '/admin/invoices', title: 'Invoice' },
  { prefix: '/admin/payments/receive-payment', title: 'Receive Payment' },
  { prefix: '/admin/payments/details', title: 'Payment Details' },
  { prefix: '/admin/payments', title: 'Payment' },
  { prefix: '/admin/integration', title: 'Integration' },
  { prefix: '/admin/users', title: 'User' },
  { prefix: '/admin/roles', title: 'Role' },
  { prefix: '/admin/security-report', title: 'Security Report' },
  { prefix: '/admin/mfa', title: 'MFA' },
  { prefix: '/admin/ar-reports', title: 'Aging Report' },
  { prefix: '/admin/ar-code', title: 'AR Codes' },
  { prefix: '/admin/payment-terms', title: 'Payment Terms' },
  { prefix: '/admin/gl-code', title: 'GL Codes' },
  { prefix: '/admin/accounts', title: 'Accounts' },
  { prefix: '/admin/collections', title: 'Collection' },
  { prefix: '/admin/dashboard', title: 'Dashboard' },
  { prefix: '/admin/credit-memo', title: 'Credit Memo' },
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, OnDestroy {
  pageTitle = 'Dashboard';
  companies: CompanyEntity[] = [];
  loadingCompanies = false;
  selectedCompanyId = '';
  companyDropdownOpen = false;

  // ✅ Add month-end balance properties
  monthEndBalance: number | null = null;
  loadingMonthEnd = false;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private companyService: CompanyService,
    private monthEndService: MonthEndService,
    private cdr: ChangeDetectorRef,
    private companySelection: CompanySelectionService
  ) {
    this.selectedCompanyId = this.companySelection.getSelectedCompanyId() ?? '';

    // ✅ Watch for company changes and load month-end balance
    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
      this.selectedCompanyId = id ?? '';

      // Load month-end balance when company changes
      if (this.selectedCompanyId) {
        this.loadMonthEndBalance(Number(this.selectedCompanyId));
      } else {
        this.monthEndBalance = null;
      }
    });

    this.setTitle(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        const nextUrl = event.urlAfterRedirects || event.url;
        this.setTitle(nextUrl);

        if (nextUrl.includes('/admin/ar-company/onboarding-complete')) {
          this.loadCompanies();
        }
      });
  }

  @HostListener('document:click', ['$event'])
  closeDropdownOnOutsideClick(event: Event) {
    const target = event.target as HTMLElement | null;
    if (!target) {
      this.companyDropdownOpen = false;
      return;
    }

    if (!target.closest('.company-select')) {
      this.companyDropdownOpen = false;
    }
  }

  ngOnInit() {
    this.loadCompanies();
  }

  private loadCompanies() {
    this.loadingCompanies = true;
    this.companyDropdownOpen = false;

    this.companyService
      .getCompany(0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.companies = res?.data?.content ?? [];
          if (this.companies.length > 0) {
            localStorage.setItem('hasCompanies', 'true');
          } else {
            localStorage.removeItem('hasCompanies');
          }

          if (this.companies.length > 0) {
            const selectedExists = this.companies.some(
              (company) => String(company.id) === this.selectedCompanyId
            );

            if (!selectedExists) {
              this.onCompanyChange(String(this.companies[0].id));
            }
          } else {
            this.onCompanyChange('');
          }

          this.loadingCompanies = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingCompanies = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ✅ Load month-end balance for selected company
  private loadMonthEndBalance(companyId: number) {
    this.loadingMonthEnd = true;

    // Get current month in YYYY-MM format
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    this.monthEndService
      .getCompanyMonthEnd(companyId, month)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.monthEndBalance = res?.data?.monthEndBalance ?? null;
          this.loadingMonthEnd = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.monthEndBalance = null;
          this.loadingMonthEnd = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ✅ Format currency for display
  formatCurrency(amount: number | null): string {
    if (amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  toggleCompanyDropdown(event: Event) {
    event.stopPropagation();
    this.companyDropdownOpen = !this.companyDropdownOpen;
  }

  onCompanyChange(companyId: string) {
    this.companyDropdownOpen = false;
    this.companySelection.setSelectedCompanyId(companyId || null);
  }

  getSelectedCompanyLabel(): string {
    if (!this.companies.length) {
      return 'No AR Company';
    }

    if (!this.selectedCompanyId) {
      return 'Select AR Company';
    }

    const selected = this.companies.find(
      (company) => String(company.id) === this.selectedCompanyId
    );

    return this.getCompanyDisplay(selected) || 'Select Company';
  }

  getCompanyDisplay(company?: CompanyEntity): string {
    if (!company) {
      return '';
    }
    const name = company.legalName || company.tradeName || '';
    const code = company.companyCode?.trim();
    if (name && code) {
      return `${name} - ${code}`;
    }
    return name || code || '';
  }

  private setTitle(url: string) {
    const cleanUrl = url.split('?')[0];

    if (cleanUrl.startsWith('/admin/customer/') && cleanUrl.includes('/invoices/')) {
      this.pageTitle = 'Invoice Detail';
      return;
    }

    const match = TITLE_RULES.find((rule) => cleanUrl.startsWith(rule.prefix));
    this.pageTitle = match ? match.title : 'Dashboard';
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
