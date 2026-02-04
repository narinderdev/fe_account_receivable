import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Loader } from '../../../shared/loader/loader';
import { CompanyService } from '../../../services/company-service';
import { CompanyEntity, FinancialSettings, PaymentSettings } from '../../../models/company.model';

type CompanyDetailTab = 'basic' | 'address' | 'financial' | 'payment';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './company-detail.html',
  styleUrl: './company-detail.css',
})
export class CompanyDetail implements OnInit {
  companyId!: number;
  companyData: CompanyEntity | null = null;
  activeTab: CompanyDetailTab = 'basic';
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const parsed = Number(idParam);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      this.errorMessage = 'Invalid AR Company id.';
      this.loading = false;
      return;
    }
    this.companyId = parsed;
    this.fetchCompanyDetail();
  }

  private fetchCompanyDetail(): void {
    this.loading = true;
    this.companyService.getCompanyById(this.companyId).subscribe({
      next: (response) => {
        this.companyData = response?.data ?? null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.companyData = null;
        this.errorMessage = 'Unable to load AR company detail. Please try again later.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getCustomerCount(): number {
    return this.companyData?.companyCustomers?.length ?? 0;
  }

  getPrimaryContact(field: keyof NonNullable<CompanyEntity['companyAddress']>): string {
    const address = this.companyData?.companyAddress;
    if (!address || address[field] === null || address[field] === undefined) {
      return '-';
    }
    const value = address[field];
    return typeof value === 'string' && value.trim() === '' ? '-' : String(value);
  }

  formatCurrencyValue(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }

  formatBoolean(value: boolean | null | undefined): string {
    return value ? 'Yes' : 'No';
  }

  formatFiscalMonth(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }
    const index = Math.max(0, Math.min(11, value - 1));
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[index];
  }

  hasPaymentSettings(): boolean {
    return !!this.companyData?.paymentSettings;
  }

  getFinancialSettings(): FinancialSettings | null {
    return this.companyData?.financialSettings ?? null;
  }

  getPaymentSettings(): PaymentSettings | null {
    return this.companyData?.paymentSettings ?? null;
  }
}
