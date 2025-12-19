import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
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

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [RouterLink, CommonModule, RouterModule, FormsModule, Loader, Spinner],
  templateUrl: './customers.html',
  styleUrls: ['./customers.css'],
})
export class Customers implements OnInit {
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

  constructor(
    private customerService: Customer,
    private companyService: CompanyService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadCustomers();
  }

  /** Load paginated customers */
  loadCustomers(page: number = 0) {
    this.loading = true;

    this.customerService.getCustomers(page, this.pageSize).subscribe({
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
        this.loadCustomers();
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
    if (this.currentPage < this.totalPages - 1) {
      this.loadCustomers(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.loadCustomers(this.currentPage - 1);
    }
  }

  /* ---------------- ACTIONS ---------------- */

  editCustomer(id: number) {
    this.router.navigate(['/admin/customers/edit', id]);
  }

  openDeleteModal(id: number) {
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
        this.loadCustomers();
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
}
