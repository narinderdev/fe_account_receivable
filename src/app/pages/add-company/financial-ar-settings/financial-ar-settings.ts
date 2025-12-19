import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../../services/company-service';
import { Subject, takeUntil } from 'rxjs';
import { Spinner } from '../../../shared/spinner/spinner';

@Component({
  selector: 'app-financial-ar-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Spinner],
  templateUrl: './financial-ar-settings.html',
  styleUrls: ['./financial-ar-settings.css'],
})
export class FinancialArSettings implements OnInit, OnDestroy {
  financialForm!: FormGroup;
  submitted = false;
  isEditMode = false;
  companyId!: number;
  companyData: any = null;
  isSaving = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
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
    } else {
      this.companyId = Number(localStorage.getItem('companyId'));
    }

    this.buildForm();

    if (this.isEditMode) {
      const existingFinancial = this.companyData?.financialSettings || this.companyData?.financial;

      if (existingFinancial) {
        this.financialForm.patchValue(existingFinancial);
      }

      this.companyService.editingCompany$.pipe(takeUntil(this.destroy$)).subscribe((data) => {
        if (data?.id === this.companyId) {
          this.companyData = data;

          const src = data.financialSettings || data.financial;
          if (src) {
            this.financialForm.patchValue(src);
          }
        }
      });
    }
  }

  buildForm() {
    this.financialForm = this.fb.group({
      fiscalYearStartMonth: ['', Validators.required],
      // defaultArAccountCode: ['', Validators.required],
      revenueRecognitionMode: ['', Validators.required],
      defaultTaxHandling: ['', Validators.required],
      defaultPaymentTerms: ['', Validators.required],
      allowOtherTerms: [false],
      enableCreditLimitChecking: [false],
      agingBucketConfig: ['', Validators.required],
      dunningFrequencyDays: ['', [Validators.required, Validators.min(1)]],
      enableAutomatedDunningEmails: [false],
      defaultCreditLimit: ['', [Validators.required, Validators.min(0)]],
    });
  }

  saveFinancialSettings() {
    this.submitted = true;
    if (this.financialForm.invalid) return;

    if (this.isEditMode) {
      this.saveLocalEditData();
    } else {
      this.saveAddMode();
    }
  }

  saveAddMode() {
    this.isSaving = true;

    this.companyService
      .createFinancialSettings(this.companyId, this.financialForm.value)
      .subscribe({
        next: () => {
          this.isSaving = false;

          const allowed = JSON.parse(localStorage.getItem('allowedTabs') || '[]');
          // allowed.push('step-3');
          localStorage.setItem('allowedTabs', JSON.stringify(allowed));

          const nextUrl = this.isEditMode
            ? `/admin/company/edit/${this.companyId}/step-4`
            : `/admin/company/add/step-4`;

          this.router.navigate([nextUrl]);
        },

        error: () => {
          this.isSaving = false;
        },
      });
  }

  saveLocalEditData() {
    this.persistFinancialEdit(true);
    this.router.navigate([`/admin/company/edit/${this.companyId}/step-4`]);
  }

  private persistFinancialEdit(force = false) {
    if (!this.isEditMode || !this.financialForm) return;
    if (!force && !this.financialForm.dirty) return;

    const updated = {
      ...(this.companyData || {}),
      financial: {
        ...this.financialForm.value,
      },
    };

    localStorage.setItem('editingCompany', JSON.stringify(updated));
    this.companyService.setEditingCompany(updated);
    this.companyData = updated;
  }

  ngOnDestroy() {
    this.persistFinancialEdit();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
