import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { Customer } from '../../services/customer';
import { CompanyService } from '../../services/company-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import { ToastrService } from 'ngx-toastr';
import { CustomerEntity, PaginatedResponse } from '../../models/customer.model';
import { CompanyEntity } from '../../models/company.model';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [RouterLink, CommonModule, RouterModule, FormsModule, Loader, Spinner],
  templateUrl: './customers.html',
  styleUrls: ['./customers.css'],
})
export class Customers implements OnInit, OnDestroy {
  customers: CustomerEntity[] = [];
  loading = true;

  // Delete Modal
  isDeleteModalOpen = false;
  deleteId: number | null = null;
  deleting = false;

  // Import Modal
  isImportModalOpen = false;
  companies: CompanyEntity[] = [];
  selectedCompanyId: number | null = null;
  loadingCompanies = false;

  // CSV Upload
  @ViewChild('csvInput') csvInput!: ElementRef;
  uploadingCsv = false;

  // Pagination
  currentPage = 0;
  totalPages = 0;
  pageSize = 6;
  activeCompanyId: number | null = null;
  private destroy$ = new Subject<void>();
  canViewCustomers = false;
  canCreateCustomer = false;
  canEditCustomer = false;
  canDeleteCustomer = false;

  constructor(
    private customerService: Customer,
    private companyService: CompanyService,
    private companySelection: CompanySelectionService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastr: ToastrService,
    private userContext: UserContextService
  ) {
    this.setPermissionFlags();
  }

  ngOnInit() {
    if (!this.canViewCustomers) {
      this.loading = false;
      return;
    }

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
        } else {
          this.customers = [];
          this.totalPages = 0;
          this.currentPage = 0;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /** Load paginated customers */
  loadCustomers(companyId: number, page: number = 0) {
    this.loading = true;

    this.customerService.getCustomers(companyId, page, this.pageSize).subscribe({
      next: (res) => {
        const data = res?.data as PaginatedResponse<CustomerEntity>;

        this.customers = data.content;
        this.totalPages = data.totalPages;
        this.currentPage = data.number;

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load customers', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Load companies for dropdown */
  loadCompanies() {
    this.loadingCompanies = true;
    this.cdr.detectChanges();

    this.companyService.getCompany(0, 100).subscribe({
      next: (res) => {
        const data = res?.data as PaginatedResponse<CompanyEntity>;
        this.companies = data.content;

        this.loadingCompanies = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load companies', err);
        this.loadingCompanies = false;
        this.toastr.error('Failed to load companies!', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  /* ---------------- IMPORT MODAL ---------------- */

  openImportModal() {
    if (!this.canCreateCustomer) {
      return;
    }

    this.isImportModalOpen = true;
    this.selectedCompanyId = null;
    this.loadCompanies();
  }

  closeImportModal() {
    this.isImportModalOpen = false;
    this.selectedCompanyId = null;
    this.companies = [];

    if (this.csvInput) {
      this.csvInput.nativeElement.value = '';
    }
  }

  handleCsvUpload(event: Event) {
    if (!this.canCreateCustomer) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      this.toastr.warning('Please upload a valid CSV file.', 'Warning');
      return;
    }

    if (!this.selectedCompanyId) {
      this.toastr.warning('Please select a company first!', 'Warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.uploadingCsv = true;
    this.cdr.detectChanges();

    this.customerService.uploadCsv(this.selectedCompanyId, formData).subscribe({
      next: () => {
        this.uploadingCsv = false;
        this.toastr.success('Customer CSV uploaded successfully!', 'Success');

        this.closeImportModal();
        if (this.activeCompanyId) {
          this.loadCustomers(this.activeCompanyId, this.currentPage);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadingCsv = false;
        console.error('CSV upload failed:', err);
        this.toastr.error('CSV upload failed!', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  /* ---------------- PAGINATION ---------------- */

  nextPage() {
    if (this.activeCompanyId && this.currentPage < this.totalPages - 1) {
      this.loadCustomers(this.activeCompanyId, this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.activeCompanyId && this.currentPage > 0) {
      this.loadCustomers(this.activeCompanyId, this.currentPage - 1);
    }
  }

  /* ---------------- ACTIONS ---------------- */

  editCustomer(id: number) {
    if (!this.canEditCustomer) {
      return;
    }

    this.router.navigate(['/admin/customers/edit', id]);
  }

  openDeleteModal(id: number) {
    if (!this.canDeleteCustomer) {
      return;
    }

    this.deleteId = id;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.deleteId = null;
  }

  confirmDelete() {
    if (!this.deleteId) return;

    this.deleting = true;

    this.customerService.deleteCustomer(this.deleteId).subscribe({
      next: () => {
        this.deleting = false;
        this.closeDeleteModal();
        if (this.activeCompanyId) {
          this.loadCustomers(this.activeCompanyId, this.currentPage);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete failed:', err);
        this.deleting = false;
        this.cdr.detectChanges();
      },
    });
  }

  viewCustomerInvoices(id: number) {
    this.router.navigate(['/admin/customers', id]);
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

    // Use modulo to cycle through colors
    const colorIndex = index % palette.length;
    return palette[colorIndex];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setPermissionFlags() {
    this.canViewCustomers = this.userContext.hasPermission('VIEW_CUSTOMERS');
    this.canCreateCustomer = this.userContext.hasPermission('CREATE_CUSTOMER');
    this.canEditCustomer = this.userContext.hasPermission('EDIT_CUSTOMER');
    this.canDeleteCustomer = this.userContext.hasPermission('DELETE_CUSTOMER');
  }
}
