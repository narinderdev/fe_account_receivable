import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterOutlet } from '@angular/router';
import { CompanyService } from '../../services/company-service';
import { CompanyEntity } from '../../models/company.model';
import { CommonModule } from '@angular/common';

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
    { key: 'step-4', label: 'Banks & Payment' },
    // { key: 'step-5', label: 'Users & Roles' },
  ];

  // Add mode → only step-1 unlocked initially
  allowedTabs: string[] = ['step-1'];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService
  ) {}

  ngOnInit() {
    // Read route param — NOT query param
    const id = this.route.snapshot.params['id'];

    if (!id) {
      const savedTabs = this.parseJson<string[]>(localStorage.getItem('allowedTabs'));
      this.allowedTabs = Array.isArray(savedTabs) && savedTabs.length ? savedTabs : ['step-1'];
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

      // Open step-1 by default
      this.goTo('step-1');
    } else {
      this.companyService.setEditingCompany(null);
      this.companyService.setOriginalCompany(null);
      localStorage.removeItem('originalCompany');

      // Get current step from route
      const currentStep = this.route.snapshot.firstChild?.routeConfig?.path;

      if (currentStep && this.allowedTabs.includes(currentStep)) {
        this.goTo(currentStep);
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
    // In add mode, only allow navigation to unlocked tabs
    if (!this.isEditMode && !this.allowedTabs.includes(step)) {
      return;
    }

    if (this.isEditMode) {
      this.router.navigate([`/admin/company/edit/${this.companyId}/${step}`]);
    } else {
      this.router.navigate([`/admin/company/add/${step}`]);
    }
  }

  isActive(step: string): boolean {
    const currentPath = this.router.url.split('?')[0].split('/').pop();
    return currentPath === step;
  }

  // Check if a tab can be accessed (enabled)
  canAccessTab(step: string): boolean {
    // In edit mode, all tabs are accessible
    if (this.isEditMode) {
      return true;
    }
    
    // In add mode, a tab is accessible if:
    // 1. It's in the allowedTabs array, OR
    // 2. It's the currently active tab
    return this.allowedTabs.includes(step) || this.isActive(step);
  }

  // Call this method after successfully saving a step to unlock the next one
  unlockNextTab(currentStep: string) {
    const currentIndex = this.tabs.findIndex(t => t.key === currentStep);
    if (currentIndex >= 0 && currentIndex < this.tabs.length - 1) {
      const nextStep = this.tabs[currentIndex + 1].key;
      this.unlockTab(nextStep);
    }
  }

  private unlockTab(step: string) {
    if (!this.allowedTabs.includes(step)) {
      this.allowedTabs.push(step);
      localStorage.setItem('allowedTabs', JSON.stringify(this.allowedTabs));
    }
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