import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { Customer } from '../../services/customer';
import { CommonModule } from '@angular/common';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import { ToastrService } from 'ngx-toastr';
import { CustomerEntity, PaginatedResponse } from '../../models/customer.model';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { UserContextService } from '../../services/user-context.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [RouterLink, CommonModule, RouterModule, Loader, Spinner],
  templateUrl: './customers.html',
  styleUrls: ['./customers.css'],
})
export class Customers implements OnInit, OnDestroy {
  customers: CustomerEntity[] = [];
  loading = true;
  downloadingTemplate = false;
  // Delete Modal
  isDeleteModalOpen = false;
  deleteId: number | null = null;
  deleting = false;

  // Import Modal
  isImportModalOpen = false;

  // CSV Upload
  @ViewChild('csvInput') csvInput!: ElementRef;
  uploadingCsv = false;

  // Pagination
  currentPage = 0;
  totalPages = 0;
  pageSize = 10;
  totalItems = 0;
  activeCompanyId: number | null = null;
  private destroy$ = new Subject<void>();
  canViewCustomers = false;
  canCreateCustomer = false;
  canEditCustomer = false;
  canDeleteCustomer = false;
  Math = Math;

  constructor(
    private customerService: Customer,
    private companySelection: CompanySelectionService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastr: ToastrService,
    private userContext: UserContextService,
  ) {
    this.setPermissionFlags();
  }

  ngOnInit() {
    if (!this.canViewCustomers) {
      this.loading = false;
      return;
    }

    this.companySelection.selectedCompanyId$.pipe(takeUntil(this.destroy$)).subscribe((id) => {
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
        this.totalItems = 0;
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
        this.totalItems = data.totalElements ?? this.customers.length;

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

  /* ---------------- IMPORT MODAL ---------------- */

  openImportModal() {
    if (!this.canCreateCustomer) {
      return;
    }

    if (!this.activeCompanyId) {
      this.toastr.warning('Please select a company from the navbar before importing.', 'Warning');
      return;
    }

    this.isImportModalOpen = true;
    this.cdr.detectChanges();
  }

  closeImportModal() {
    this.isImportModalOpen = false;

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

    const companyId = this.activeCompanyId;

    if (!companyId) {
      this.toastr.warning('Please select a company first!', 'Warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.uploadingCsv = true;
    this.cdr.detectChanges();

    this.customerService.uploadCsv(companyId, formData).subscribe({
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

        const backendMessage = err?.error?.message;
        if (backendMessage) {
          this.toastr.error(backendMessage, 'Error');
        } else {
          this.toastr.error('CSV upload failed!', 'Error');
        }

        this.cdr.detectChanges();
      },
    });
  }

  /* ---------------- PAGINATION ---------------- */

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const current = this.currentPage + 1;
    const total = this.totalPages;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current <= 3) {
        pages.push(2, 3, 4, -1, total);
      } else if (current >= total - 2) {
        pages.push(-1, total - 3, total - 2, total - 1, total);
      } else {
        pages.push(-1, current - 1, current, current + 1, -1, total);
      }
    }

    return pages;
  }

  goToPage(page: number) {
    if (this.activeCompanyId && page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.loadCustomers(this.activeCompanyId, page);
    }
  }

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

  downloadTemplate() {
    this.downloadingTemplate = true;
    this.cdr.detectChanges();

    this.customerService.downloadTemplate().subscribe({
      next: (res) => {
        const metadata = res.data;

        // Generate CSV with two rows: headers and required indicators
        const headers: string[] = [];
        const requiredIndicators: string[] = [];

        metadata.tabs.forEach((tab: any) => {
          tab.fields.forEach((field: any) => {
            // Add field label with asterisk if required
            if (field.required) {
              headers.push(`${field.label} *`);
            } else if (field.requiredIf) {
              headers.push(`${field.label} (Conditional)`);
            } else {
              headers.push(field.label);
            }

            // Add indicator in second row
            if (field.required) {
              requiredIndicators.push('Required');
            } else if (field.requiredIf) {
              requiredIndicators.push(`Required if ${field.requiredIf}`);
            } else {
              requiredIndicators.push('Optional');
            }
          });
        });

        // Create CSV content with headers and requirement info
        const csvContent = headers.join(',') + '\n' + requiredIndicators.join(',') + '\n';

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', 'customer_import_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.downloadingTemplate = false;
        this.toastr.success('Template downloaded successfully!', 'Success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.downloadingTemplate = false;
        console.error('Template download failed:', err);
        this.toastr.error('Failed to download template!', 'Error');
        this.cdr.detectChanges();
      },
    });
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
