import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterOutlet, NavigationEnd } from '@angular/router';
import { CompanyService } from '../../services/company-service';
import { CompanyEntity } from '../../models/company.model';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-add-company',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './add-company.html',
  styleUrl: './add-company.css',
})
export class AddCompany implements OnInit {
  isEditMode = false;
  companyId: number | null = null;
  companyData: CompanyEntity | null = null;

  tabs = [
    { key: 'step-1', label: 'Basic Info' },
    { key: 'step-2', label: 'Address Info' },
    { key: 'step-3', label: 'Financial AR Settings' },
  ];

  allowedTabs: string[] = ['step-1'];
  currentStep: string = 'step-1';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];

    if (!id) {
      const savedTabs = this.parseJson<string[]>(localStorage.getItem('allowedTabs'));
      this.allowedTabs = Array.isArray(savedTabs) && savedTabs.length ? savedTabs : ['step-1'];

      // Get current step from localStorage in add mode
      const savedCurrentStep = localStorage.getItem('currentStep');
      this.currentStep = savedCurrentStep || 'step-1';

      // Subscribe to route changes to update currentStep in ADD mode
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          const currentPath = this.router.url.split('?')[0].split('/').pop();
          if (currentPath && this.tabs.some(t => t.key === currentPath)) {
            this.currentStep = currentPath;
          }
        });
    }

    if (id) {
      this.isEditMode = true;
      this.companyId = Number(id);

      const saved = this.parseCompany(localStorage.getItem('editingCompany'));
      if (saved && saved.id === this.companyId) {
        this.companyData = saved;
        this.companyService.setEditingCompany(saved);
      } else {
        this.companyService.setEditingCompany(null);
      }

      const originalSaved = this.parseCompany(localStorage.getItem('originalCompany'));
      if (originalSaved && originalSaved.id === this.companyId) {
        this.companyService.setOriginalCompany(originalSaved);
      } else {
        this.companyService.setOriginalCompany(null);
      }

      this.loadCompanyForEdit(this.companyId);
      this.goTo('step-1');
    } else {
      this.companyService.setEditingCompany(null);
      this.companyService.setOriginalCompany(null);
      localStorage.removeItem('originalCompany');

      const currentStepFromRoute = this.route.snapshot.firstChild?.routeConfig?.path;

      if (currentStepFromRoute) {
        this.currentStep = currentStepFromRoute;
        this.goTo(currentStepFromRoute);
      } else {
        this.goTo('step-1');
      }
    }
  }

  loadCompanyForEdit(id: number) {
    this.companyService.getCompanyById(id).subscribe({
      next: (res) => {
        const data = res?.data;

        this.companyData = data;
        localStorage.setItem('editingCompany', JSON.stringify(data));
        localStorage.setItem('originalCompany', JSON.stringify(data));
        this.companyService.setEditingCompany(data);
        this.companyService.setOriginalCompany(data);

        this.allowedTabs = this.tabs.map((t) => t.key);
      },
      error: (err) => {
        console.error('Error loading AR Company:', err);
      },
    });
  }

  goTo(step: string) {
    // In add mode, only allow navigation to the current step
    if (!this.isEditMode && step !== this.currentStep) {
      return;
    }

    if (this.isEditMode) {
      this.router.navigate([`/admin/ar-company/edit/${this.companyId}/${step}`]);
    } else {
      this.router.navigate([`/admin/ar-company/add/${step}`]);
    }
  }

  isActive(step: string): boolean {
    const currentPath = this.router.url.split('?')[0].split('/').pop();
    return currentPath === step;
  }

  canAccessTab(step: string): boolean {
    if (this.isEditMode) {
      return true;
    }

    // In add mode, only the current step is accessible
    return step === this.currentStep;
  }

  moveToNextStep(currentStep: string) {
    const currentIndex = this.tabs.findIndex((t) => t.key === currentStep);
    if (currentIndex >= 0 && currentIndex < this.tabs.length - 1) {
      const nextStep = this.tabs[currentIndex + 1].key;
      this.currentStep = nextStep;
      localStorage.setItem('currentStep', nextStep);
      this.goTo(nextStep);
    }
  }

  public unlockAndMoveToNextStep(currentStep: string) {
    this.moveToNextStep(currentStep);
  }

  private parseJson<T>(value: string | null): T | null {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private parseCompany(value: string | null): CompanyEntity | null {
    return this.parseJson<CompanyEntity>(value);
  }
}
