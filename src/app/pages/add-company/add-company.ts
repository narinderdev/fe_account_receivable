import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterOutlet } from '@angular/router';
import { CompanyService } from '../../services/company-service';

@Component({
  selector: 'app-add-company',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './add-company.html',
  styleUrl: './add-company.css',
})
export class AddCompany implements OnInit {
  isEditMode = false;
  companyId: number | null = null;
  companyData: any = null;

  tabs = [
    { key: 'step-1', label: 'Basic Info' },
    { key: 'step-2', label: 'Financial AR Settings' },
    { key: 'step-3', label: 'Banks & Payments' },
    { key: 'step-4', label: 'Users & Roles' },
    { key: 'complete', label: 'Complete' },
  ];

  // Add mode → only step-1 unlocked
  allowedTabs: string[] = ['step-1'];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService
  ) {}

  ngOnInit() {
    // Read route param — NOT query param
    const id = this.route.snapshot.params['id'];

    if (id) {
      this.isEditMode = true;
      this.companyId = Number(id);

      const saved = localStorage.getItem('editingCompany');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id === this.companyId) {
          this.companyData = parsed;
          this.companyService.setEditingCompany(parsed);
        } else {
          this.companyService.setEditingCompany(null);
        }
      } else {
        this.companyService.setEditingCompany(null);
      }

      const originalSaved = localStorage.getItem('originalCompany');
      if (originalSaved) {
        const parsedOriginal = JSON.parse(originalSaved);
        if (parsedOriginal?.id === this.companyId) {
          this.companyService.setOriginalCompany(parsedOriginal);
        } else {
          this.companyService.setOriginalCompany(null);
        }
      } else {
        this.companyService.setOriginalCompany(null);
      }

      this.loadCompanyForEdit(this.companyId);

      // Open step-1 by default
      this.goTo('step-1');
    } else {
      this.companyService.setEditingCompany(null);
      this.companyService.setOriginalCompany(null);
      localStorage.removeItem('originalCompany');
      // ADD mode: go to first step
      this.goTo('step-1');
    }
  }

  // ---------------------------------------------------------
  // LOAD COMPANY DATA FOR EDIT MODE
  // ---------------------------------------------------------
  loadCompanyForEdit(id: number) {
    this.companyService.getCompanyById(id).subscribe({
      next: (res) => {
        const data = res?.data;

        this.companyData = data;
        localStorage.setItem('editingCompany', JSON.stringify(data));
        localStorage.setItem('originalCompany', JSON.stringify(data));
        this.companyService.setEditingCompany(data);
        this.companyService.setOriginalCompany(data);

        // In edit mode → Unlock all tabs
        this.allowedTabs = this.tabs.map((t) => t.key);
      },
      error: (err) => {
        console.error('Error loading company:', err);
      },
    });
  }

  // ---------------------------------------------------------
  // STEP NAVIGATION
  // ---------------------------------------------------------
  goTo(step: string) {
    if (!this.isEditMode && !this.allowedTabs.includes(step)) return;

    if (this.isEditMode) {
      this.router.navigate([`/admin/company/edit/${this.companyId}/${step}`]);
    } else {
      this.router.navigate([`/admin/company/add/${step}`]);
    }
  }

  isActive(step: string): boolean {
    return this.router.url.includes(step);
  }

  unlockTab(nextStep: string) {
    if (!this.allowedTabs.includes(nextStep)) {
      this.allowedTabs.push(nextStep);
    }
    this.goTo(nextStep);
  }
}
