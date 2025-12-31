import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CompanyService } from '../../../services/company-service';
import { Spinner } from '../../../shared/spinner/spinner';
import { CompanyEntity } from '../../../models/company.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-company-address',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  templateUrl: './company-address.html',
  styleUrls: ['./company-address.css'],
})
export class CompanyAddress implements OnInit, OnDestroy {
  addressForm!: FormGroup;
  submitted = false;

  companyId!: number;
  isEditMode = false;
  companyData: CompanyEntity | null = null;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private companyService: CompanyService
  ) {}

  ngOnInit() {
    const id = this.route.parent?.snapshot.params['id'];
    this.isEditMode = !!id;

    this.companyId = id ? Number(id) : Number(localStorage.getItem('companyId'));

    this.companyData = this.parseCompany(localStorage.getItem('editingCompany'));

    this.buildForm();

    if (this.companyData?.companyAddress) {
      this.addressForm.patchValue(this.companyData.companyAddress);
    } else if (this.companyData) {
      this.addressForm.patchValue(this.companyData);
    }
  }

  wordLimitValidator(limit: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const words = control.value.trim().split(/\s+/);
      return words.length > limit ? { wordLimit: true } : null;
    };
  }

  buildForm() {
    this.addressForm = this.fb.group({
      addressLine1: ['', [Validators.required, this.wordLimitValidator(100)]],
      city: [
        '',
        [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/), this.wordLimitValidator(100)],
      ],
      stateProvince: [
        '',
        [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/), this.wordLimitValidator(100)],
      ],
      postalCode: [
        '',
        [Validators.required, Validators.pattern(/^[0-9]*$/), Validators.maxLength(6)],
      ],
      addressCountry: ['', Validators.required],
      primaryContactName: ['', Validators.required],
      primaryContactEmail: [
        '',
        [Validators.required, Validators.pattern(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/)],
      ],
      primaryContactPhone: [
        '',
        [Validators.required, Validators.pattern(/^[0-9]*$/), Validators.maxLength(10)],
      ],
      website: [''],
      primaryContactCountry: ['', Validators.required],
    });
  }

  onCityInput() {
    let value = this.addressForm.get('city')?.value || '';
    value = value.replace(/[0-9]/g, '');
    this.addressForm.get('city')?.setValue(value, { emitEvent: false });
  }

  onStateInput() {
    let value = this.addressForm.get('stateProvince')?.value || '';
    value = value.replace(/[0-9]/g, '');
    this.addressForm.get('stateProvince')?.setValue(value, { emitEvent: false });
  }

  onPostalInput() {
    let value = this.addressForm.get('postalCode')?.value || '';
    value = value.replace(/\D/g, '').slice(0, 6);
    this.addressForm.get('postalCode')?.setValue(value, { emitEvent: false });
  }

  onPhoneInput() {
    let value = this.addressForm.get('primaryContactPhone')?.value || '';
    value = value.replace(/\D/g, '').slice(0, 10);
    this.addressForm.get('primaryContactPhone')?.setValue(value, { emitEvent: false });
  }

  onEmailInput() {
    let value = this.addressForm.get('primaryContactEmail')?.value || '';
    this.addressForm.get('primaryContactEmail')?.setValue(value.toLowerCase(), {
      emitEvent: false,
    });
  }

  saveAddress() {
    this.submitted = true;

    if (this.addressForm.invalid || this.isSaving) {
      return;
    }

    const payload = this.addressForm.value;

    if (this.isEditMode) {
      this.persistEditAddress(true);
      this.router.navigate([`/admin/company/edit/${this.companyId}/step-3`]);
      return;
    }

    this.isSaving = true;

    this.companyService
      .createAddress(this.companyId, payload)
      .pipe(
        finalize(() => {
          this.isSaving = false;
        })
      )
      .subscribe({
        next: (res) => {
          const updated: CompanyEntity = {
            ...(this.companyData || ({} as CompanyEntity)),
            ...payload,
          };
          localStorage.setItem('editingCompany', JSON.stringify(updated));
          localStorage.setItem('currentStep', 'step-3');
          this.companyService.setEditingCompany(updated);
          this.companyData = updated;

          this.router.navigate([`/admin/company/add/step-3`]);
        },
        error: (err) => {
          console.error('Address API failed', err);
        },
      });
  }

  private persistEditAddress(force = false) {
    if (!this.isEditMode || !this.addressForm) return;
    if (!force && !this.addressForm.dirty) return;

    if (!this.companyData) {
      return;
    }

    const updated: CompanyEntity = {
      ...this.companyData,
      ...this.addressForm.value,
    } as CompanyEntity;

    localStorage.setItem('editingCompany', JSON.stringify(updated));
    this.companyService.setEditingCompany(updated);
    this.companyData = updated;
  }

  ngOnDestroy() {
    this.persistEditAddress();
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
}
