import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CompanyService } from '../../../services/company-service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Spinner } from '../../../shared/spinner/spinner';
import { CompanyEntity } from '../../../models/company.model';
import { AddCompany } from '../add-company';

@Component({
  selector: 'app-basic-info',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, Spinner],
  templateUrl: './basic-info.html',
  styleUrls: ['./basic-info.css'],
})
export class BasicInfo implements OnInit, OnDestroy {
  basicForm!: FormGroup;
  submitted = false;
  isSaving = false;

  isEditMode = false;
  companyId: number | null = null;
  companyData: CompanyEntity | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Check Edit Mode
    const id = this.route.parent?.snapshot.params['id'] ?? this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.companyId = Number(id);
      const parsed = this.parseCompany(localStorage.getItem('editingCompany'));
      if (parsed?.id === this.companyId) {
        this.companyData = parsed;
      }
    }

    this.buildForm();

    if (this.isEditMode) {
      if (this.companyData) {
        this.patchForm();
      }
      this.companyService.editingCompany$.pipe(takeUntil(this.destroy$)).subscribe((data) => {
        if (data && data.id === this.companyId) {
          this.companyData = data;
          this.patchForm();
        }
      });
    }
  }

  buildForm() {
    this.basicForm = this.fb.group({
      legalName: ['', Validators.required],
      tradeName: ['', Validators.required],
      companyCode: ['', Validators.required],
      country: ['', Validators.required],
      baseCurrency: ['', Validators.required],
      timeZone: ['', Validators.required],
    });
  }

  patchForm() {
    if (!this.companyData) {
      return;
    }
    this.basicForm.patchValue({
      legalName: this.companyData.legalName,
      tradeName: this.companyData.tradeName,
      companyCode: this.companyData.companyCode,
      country: this.companyData.country,
      baseCurrency: this.companyData.baseCurrency,
      timeZone: this.companyData.timeZone,
    });
  }

  saveAndContinue() {
    this.submitted = true;
    if (this.basicForm.invalid || this.isSaving) return;

    if (!this.isEditMode) {
      this.createCompany(); // ADD MODE
    } else {
      this.storeEditChanges(); // EDIT MODE
    }
  }

  // ---------------------------------------------------
  // ADD MODE → step-1 API
  // ---------------------------------------------------
  createCompany() {
    this.isSaving = true;

    this.companyService.createCompany(this.basicForm.value).subscribe({
      next: (res) => {
        this.isSaving = false;
        const id = res.data.id;

        localStorage.setItem('companyId', id);
        localStorage.setItem('editingCompany', JSON.stringify(res.data));
        localStorage.setItem('currentStep', 'step-2');

        // Navigate directly to step-2 and let parent component handle tab state
        this.router.navigate(['/admin/company/add/step-2'], { queryParams: { id } });
      },
      error: () => (this.isSaving = false),
    });
  }

  // ---------------------------------------------------
  // EDIT MODE → No API here
  // Save form to localStorage
  // ---------------------------------------------------
  storeEditChanges() {
    this.persistEditChanges(true);
    this.router.navigate([`/admin/company/edit/${this.companyId}/step-2`]);
  }

  private persistEditChanges(force = false) {
    if (!this.isEditMode || !this.basicForm) return;
    if (!force && !this.basicForm.dirty) return;

    if (!this.companyData) {
      return;
    }

    const updated: CompanyEntity = {
      ...this.companyData,
      ...this.basicForm.value,
    } as CompanyEntity;

    localStorage.setItem('editingCompany', JSON.stringify(updated));
    this.companyService.setEditingCompany(updated);
    this.companyData = updated;
  }

  private parseCompany(value: string | null): CompanyEntity | null {
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as CompanyEntity;
    } catch {
      return null;
    }
  }

  ngOnDestroy() {
    this.persistEditChanges();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
