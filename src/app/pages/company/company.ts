import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../services/company-service';
import { Loader } from '../../shared/loader/loader';
import { Spinner } from '../../shared/spinner/spinner';
import { CompanyEntity } from '../../models/company.model';
import { UserContextService } from '../../services/user-context.service';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, Loader, Spinner],
  templateUrl: './company.html',
  styleUrl: './company.css',
})
export class Company implements OnInit {
  companies: CompanyEntity[] = [];
  loading = true;

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  Math = Math;

  // DELETE MODAL STATE
  isDeleteModalOpen = false;
  deleteId: number | null = null;
  deleting = false;
  canCreateCompany = false;
  canUpdateCompany = false;
  canDeleteCompany = false;
  showActionsColumn = false;

  constructor(
    private companyService: CompanyService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private userContext: UserContextService
  ) {
    this.canCreateCompany = this.userContext.hasPermission('CREATE_COMPANY');
    this.canUpdateCompany = this.userContext.hasPermission('UPDATE_COMPANY');
    this.canDeleteCompany = this.userContext.hasPermission('DELETE_COMPANY');
    this.showActionsColumn = this.canUpdateCompany || this.canDeleteCompany;
  }

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.loading = true;

    this.companyService.getCompany(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        const data = res?.data;

        this.companies = data?.content || [];
        this.totalPages = data?.totalPages || 0;
        this.totalElements = data?.totalElements || 0;

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

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
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadCompanies();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadCompanies();
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadCompanies();
    }
  }

  // EDIT COMPANY
  editCompany(id: number) {
    if (!this.canUpdateCompany) {
      return;
    }
    this.router.navigate(['/admin/company/edit', id, 'step-1']);
  }

  openDeleteModal(id: number) {
    if (!this.canDeleteCompany) {
      return;
    }
    this.deleteId = id;

    // Hide page loader while modal is open
    const oldLoadingState = this.loading;
    this.loading = false;

    this.isDeleteModalOpen = true;

    // Restore loader state after modal closes
    setTimeout(() => (this.loading = oldLoadingState), 0);
  }

  // CLOSE MODAL
  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.deleteId = null;
  }

  confirmDelete() {
    if (!this.deleteId) return;

    this.deleting = true; // show small spinner only in the button

    this.companyService.deleteCompany(this.deleteId).subscribe({
      next: () => {
        this.deleting = false;

        // Close modal first
        this.closeDeleteModal();

        // Wait for modal to disappear before showing page loader
        setTimeout(() => {
          this.loading = true;
          this.loadCompanies();
        }, 50);
      },
      error: (err) => {
        console.error('Delete failed:', err);
        this.deleting = false;
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

    // Use modulo to cycle through colors
    const colorIndex = index % palette.length;
    return palette[colorIndex];
  }
}
