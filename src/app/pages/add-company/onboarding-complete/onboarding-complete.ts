import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../../services/company-service';
import { CompanySelectionService } from '../../../services/company-selection.service';

@Component({
  selector: 'app-onboarding-complete',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './onboarding-complete.html',
  styleUrl: './onboarding-complete.css',
})
export class OnboardingComplete implements OnInit {
  isEditMode = false;
  isUpdating = false;
  infoMessage: string | null = null;
  errorMessage: string | null = null;
  private companyId: number | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private companySelection: CompanySelectionService
  ) {}

  ngOnInit() {
    const routeId = this.route.snapshot.params['id'] ?? this.route.parent?.snapshot.params['id'];
    const queryId = this.route.snapshot.queryParamMap.get('id');

    if (routeId) {
      this.isEditMode = true;
      this.companyId = Number(routeId);
      this.hydrateCachedState();
      this.markCompanyAvailability();
    } else if (queryId) {
      this.companyId = Number(queryId);
      this.markCompanyAvailability();
    }
  }

  submitUpdates() {
    if (!this.isEditMode || !this.companyId || this.isUpdating) return;

    this.errorMessage = null;
    this.infoMessage = null;

    const payload = this.companyService.getChangedCompanyPayload();
    if (!payload || Object.keys(payload).length === 0) {
      this.infoMessage = 'No changes detected to update.';
      return;
    }

    this.isUpdating = true;

    this.companyService.updateCompany(this.companyId, payload).subscribe({
      next: () => {
        this.isUpdating = false;
        localStorage.removeItem('editingCompany');
        localStorage.removeItem('originalCompany');
        this.companyService.setEditingCompany(null);
        this.companyService.setOriginalCompany(null);
        this.router.navigate(['/admin/lender']);
      },
      error: () => {
        this.isUpdating = false;
        this.errorMessage = 'Failed to update lender. Please try again.';
      },
    });
  }

  private hydrateCachedState() {
    if (!this.companyService.getEditingCompanySnapshot()) {
      const saved = localStorage.getItem('editingCompany');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed?.id || parsed.id === this.companyId) {
          this.companyService.setEditingCompany(parsed);
        }
      }
    }

    if (!this.companyService.getOriginalCompanySnapshot()) {
      const savedOriginal = localStorage.getItem('originalCompany');
      if (savedOriginal) {
        const parsedOriginal = JSON.parse(savedOriginal);
        if (!parsedOriginal?.id || parsedOriginal.id === this.companyId) {
          this.companyService.setOriginalCompany(parsedOriginal);
        }
      }
    }
  }

  private markCompanyAvailability() {
    if (!this.companyId) {
      return;
    }

    localStorage.setItem('hasCompanies', 'true');

    const selectedCompanyId = this.companySelection.getSelectedCompanyId();
    if (!this.isEditMode || !selectedCompanyId) {
      this.companySelection.setSelectedCompanyId(String(this.companyId));
    }
  }
}
