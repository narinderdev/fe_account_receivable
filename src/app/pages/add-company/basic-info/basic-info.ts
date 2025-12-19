import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CompanyService } from '../../../services/company-service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Spinner } from '../../../shared/spinner/spinner';
import { ToastService } from '../../../shared/toast/toast-service';

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
  companyData: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Check Edit Mode
    const id = this.route.parent?.snapshot.params['id'] ?? this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.companyId = Number(id);
      const saved = localStorage.getItem('editingCompany');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id === this.companyId) {
          this.companyData = parsed;
        }
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
    this.basicForm.patchValue({
      legalName: this.companyData.legalName,
      tradeName: this.companyData.tradeName,
      companyCode: this.companyData.companyCode,
      country: this.companyData.country,
      baseCurrency: this.companyData.baseCurrency,
      timeZone: this.companyData.timeZone,
      // addressLine1: this.companyData.addressLine1,
      // city: this.companyData.city,
      // stateProvince: this.companyData.stateProvince,
      // postalCode: this.companyData.postalCode,
      // addressCountry: this.companyData.addressCountry,
      // primaryContactName: this.companyData.primaryContactName,
      // primaryContactEmail: this.companyData.primaryContactEmail,
      // primaryContactPhone: this.companyData.primaryContactPhone,
      // website: this.companyData.website,
      // primaryContactCountry: this.companyData.primaryContactCountry,
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
        this.toastService.show('Company added successfully.');

        this.router.navigate(['/admin/company/add/step-2'], { queryParams: { id } });
      },
      error: () => {
        this.isSaving = false;
        this.toastService.show('Failed to add company.', 'error');
      },
    });
  }

  // ---------------------------------------------------
  // EDIT MODE → No API here
  // Save form to localStorage
  // ---------------------------------------------------
  storeEditChanges() {
    const updated = {
      ...this.companyData,
      ...this.basicForm.value,
    };

    localStorage.setItem('editingCompany', JSON.stringify(updated));
    this.companyService.setEditingCompany(updated);

    this.router.navigate([`/admin/company/edit/${this.companyId}/step-2`]);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
