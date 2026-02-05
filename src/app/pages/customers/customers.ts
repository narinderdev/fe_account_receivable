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
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [RouterLink, CommonModule, RouterModule, Loader, Spinner],
  templateUrl: './customers.html',
  styleUrls: ['./customers.css'],
})
export class Customers implements OnInit, OnDestroy {
  customers: CustomerEntity[] = [];
  filteredCustomers: CustomerEntity[] = [];
  searchTerm = '';
  loading = true;
  downloadingTemplate = false;

  // Delete Modal
  isDeleteModalOpen = false;
  deleteId: number | null = null;
  deleting = false;

  // Import Modal
  isImportModalOpen = false;

  // File Upload
  @ViewChild('fileInput') fileInput!: ElementRef;
  uploadingFile = false;

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
        this.filteredCustomers = [];
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
        this.customers = data?.content ?? [];
        this.applySearchFilter();
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
      this.toastr.warning(
        'Please select a AR company from the navbar before importing.',
        'Warning',
      );
      return;
    }

    this.isImportModalOpen = true;
    this.cdr.detectChanges();
  }

  closeImportModal() {
    if (this.uploadingFile) {
      return;
    }

    this.isImportModalOpen = false;

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }

    this.cdr.detectChanges();
  }

  downloadTemplate() {
    if (!this.canCreateCustomer) return;

    this.downloadingTemplate = true;
    this.cdr.detectChanges();

    this.customerService.downloadTemplate().subscribe({
      next: (res) => {
        const metadata = res?.data;
        const headers: string[] = [];
        const exampleRow: any[] = [];

        // Collect all fields from all tabs
        metadata?.tabs?.forEach((tab: any) => {
          tab.fields?.forEach((field: any) => {
            headers.push(field.name);
            const example = field.rules?.example !== undefined ? field.rules.example : '';
            exampleRow.push(example);
          });
        });

        const wb = XLSX.utils.book_new();
        const wsData: any[][] = [];

        if (headers.length) {
          wsData.push(headers);
          wsData.push(exampleRow);
        } else {
          wsData.push(['No metadata available']);
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = headers.map(() => ({ wch: 25 }));

        XLSX.utils.book_append_sheet(wb, ws, 'Customer Template');
        XLSX.writeFile(wb, 'customer_import_template.xlsx');

        this.toastr.success('Excel template downloaded successfully!', 'Success');
        this.downloadingTemplate = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Customer template download failed:', err);
        this.toastr.error('Failed to download template!', 'Error');
        this.downloadingTemplate = false;
        this.cdr.detectChanges();
      },
    });
  }

  downloadCsvTemplate() {
    if (!this.canCreateCustomer) return;

    this.downloadingTemplate = true;
    this.cdr.detectChanges();

    this.customerService.downloadTemplate().subscribe({
      next: (res) => {
        const metadata = res?.data;
        const headers: string[] = [];
        const exampleRow: any[] = [];

        // Collect all fields from all tabs
        metadata?.tabs?.forEach((tab: any) => {
          tab.fields?.forEach((field: any) => {
            headers.push(field.name);
            const example = field.rules?.example !== undefined ? field.rules.example : '';
            exampleRow.push(example);
          });
        });

        const csvRows: string[] = [];

        if (headers.length) {
          // Add headers
          csvRows.push(headers.join(','));
          // Add example row
          csvRows.push(exampleRow.join(','));
        } else {
          csvRows.push('No metadata available');
        }

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'customer_import_template.csv';
        link.click();
        URL.revokeObjectURL(link.href);

        this.toastr.success('CSV template downloaded successfully!', 'Success');
        this.downloadingTemplate = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Customer template download failed:', err);
        this.toastr.error('Failed to download template!', 'Error');
        this.downloadingTemplate = false;
        this.cdr.detectChanges();
      },
    });
  }

  handleFileUpload(event: Event) {
    if (!this.canCreateCustomer) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      this.toastr.warning(
        'Please upload a valid CSV or Excel file (.csv, .xlsx, .xls).',
        'Warning',
      );
      input.value = '';
      return;
    }

    if (!this.activeCompanyId) {
      this.toastr.warning(
        'Please select a AR Company from the navbar before importing.',
        'Warning',
      );
      input.value = '';
      return;
    }

    this.uploadingFile = true;
    this.cdr.detectChanges();

    // Check if file is Excel or CSV
    const isExcel = fileExtension === '.xlsx' || fileExtension === '.xls';

    if (isExcel) {
      // Convert Excel to CSV
      this.convertExcelToCsvAndUpload(file, input);
    } else {
      // Upload CSV directly
      this.uploadCsvFile(file, input);
    }
  }

  private convertExcelToCsvAndUpload(file: File, input: HTMLInputElement) {
    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to CSV
        let csvString = XLSX.utils.sheet_to_csv(worksheet, {
          dateNF: 'yyyy-mm-dd',
          FS: ',',
          RS: '\n',
          strip: false,
        });

        // Normalize boolean values to lowercase (FALSE -> false, TRUE -> true)
        csvString = csvString.replace(/\bFALSE\b/g, 'false').replace(/\bTRUE\b/g, 'true');

        const csvBlob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const csvFile = new File([csvBlob], file.name.replace(/\.(xlsx|xls)$/i, '.csv'), {
          type: 'text/csv',
        });

        // Upload the CSV file
        this.uploadCsvFile(csvFile, input);
      } catch (error) {
        console.error('Error converting Excel to CSV:', error);
        this.toastr.error('Failed to convert Excel file to CSV format.', 'Conversion Error');
        this.uploadingFile = false;
        input.value = '';
        this.cdr.detectChanges();
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading Excel file:', error);
      this.toastr.error('Failed to read Excel file.', 'Read Error');
      this.uploadingFile = false;
      input.value = '';
      this.cdr.detectChanges();
    };

    reader.readAsArrayBuffer(file);
  }

  private uploadCsvFile(file: File, input: HTMLInputElement) {
    const companyId = this.activeCompanyId;

    if (!companyId) {
      this.toastr.warning('Please select a company first!', 'Warning');
      this.uploadingFile = false;
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.customerService.uploadCsv(companyId, formData).subscribe({
      next: (response) => {
        this.uploadingFile = false;

        const data = response?.data;
        const totalRows = data?.totalRows || 0;
        const successCount = data?.successCount || 0;
        const failureCount = data?.failureCount || 0;
        const errors = data?.errors || [];

        // Show detailed success/failure message
        if (failureCount === 0) {
          this.toastr.success(
            `Successfully imported ${successCount} of ${totalRows} customer(s)!`,
            'Import Successful',
            { timeOut: 5000 },
          );
        } else if (successCount > 0) {
          this.toastr.warning(
            `Imported ${successCount} customer(s) successfully. ${failureCount} failed.${
              errors.length > 0 ? ' Check console for details.' : ''
            }`,
            'Partial Success',
            { timeOut: 7000 },
          );

          if (errors.length > 0) {
            console.error('Import errors:', errors);
          }
        } else {
          this.toastr.error(
            `Failed to import all ${totalRows} customer(s).${
              errors.length > 0 ? ' Check console for details.' : ''
            }`,
            'Import Failed',
            { timeOut: 7000 },
          );

          if (errors.length > 0) {
            console.error('Import errors:', errors);
          }
        }

        this.closeImportModal();

        // Reload customers if any were successfully imported
        if (successCount > 0 && this.activeCompanyId) {
          this.loadCustomers(this.activeCompanyId, this.currentPage);
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadingFile = false;
        console.error('Customer file upload failed:', err);

        const backendMessage = err?.error?.message;
        if (backendMessage) {
          this.toastr.error(backendMessage, 'Upload Error');
        } else {
          this.toastr.error('Customer file upload failed!', 'Error');
        }

        input.value = '';
        this.cdr.detectChanges();
      },
    });
  }

  formatCustomerType(type?: string | null): string {
    if (!type) return '—';

    const formatted = type.toLowerCase();
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
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

    this.router.navigate(['/admin/customer/edit', id]);
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
    this.router.navigate(['/admin/customer', id]);
  }

  onSearchInput(term: string) {
    this.searchTerm = term;
    this.applySearchFilter();
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

  private applySearchFilter() {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      this.filteredCustomers = [...this.customers];
      return;
    }

    this.filteredCustomers = this.customers.filter((customer) => {
      const name = customer.customerName?.toLowerCase() ?? '';
      return name.includes(term);
    });
  }
}
