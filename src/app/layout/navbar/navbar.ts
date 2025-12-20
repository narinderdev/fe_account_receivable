import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { CompanyService } from '../../services/company-service';
import { CompanyEntity } from '../../models/company.model';
import { CompanySelectionService } from '../../services/company-selection.service';

type TitleRule = {
  prefix: string;
  title: string;
};

const TITLE_RULES: TitleRule[] = [
  { prefix: '/admin/company/add', title: 'Add Company' },
  { prefix: '/admin/company/edit', title: 'Edit Company' },
  { prefix: '/admin/company', title: 'Company' },
  { prefix: '/admin/customers/add', title: 'Add Customer' },
  { prefix: '/admin/customers/edit', title: 'Edit Customer' },
  { prefix: '/admin/customers/', title: 'Customer Details' },
  { prefix: '/admin/customers', title: 'Customers' },
  { prefix: '/admin/invoices/create', title: 'Create Invoice' },
  { prefix: '/admin/invoices/detail', title: 'Invoice Detail' },
  { prefix: '/admin/invoices', title: 'Invoices' },
  { prefix: '/admin/payments/receive-payment', title: 'Receive Payment' },
  { prefix: '/admin/payments/details', title: 'Payment Details' },
  { prefix: '/admin/payments', title: 'Payments' },
  { prefix: '/admin/users', title: 'Users' },
  { prefix: '/admin/roles', title: 'Roles' },
  { prefix: '/admin/ar-reports', title: 'AR Reports' },
  { prefix: '/admin/collections', title: 'Collections' },
  { prefix: '/admin/dashboard', title: 'Dashboard' },
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

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private companyService: CompanyService,
    private companySelection: CompanySelectionService
  ) {
    this.selectedCompanyId = this.companySelection.getSelectedCompanyId() ?? '';

    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        this.selectedCompanyId = id ?? '';
      });

    this.setTitle(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.setTitle(event.urlAfterRedirects || event.url);
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
        },
        error: () => {
          this.loadingCompanies = false;
        },
      });
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
      return 'No Companies';
    }

    if (!this.selectedCompanyId) {
      return 'Select Company';
    }

    const selected = this.companies.find(
      (company) => String(company.id) === this.selectedCompanyId
    );

    return selected?.legalName || selected?.tradeName || 'Select Company';
  }

  private setTitle(url: string) {
    const cleanUrl = url.split('?')[0];

    if (cleanUrl.startsWith('/admin/customers/') && cleanUrl.includes('/invoices/')) {
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
