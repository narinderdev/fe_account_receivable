import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CompanyService } from '../../../services/company-service';
import { Spinner } from '../../../shared/spinner/spinner';

@Component({
  selector: 'app-company-address',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Spinner],
  templateUrl: './company-address.html',
  styleUrls: ['./company-address.css'],
})
export class CompanyAddress implements OnInit, OnDestroy {
  addressForm!: FormGroup;
  submitted = false;

  companyId!: number;
  isEditMode = false;
  companyData: any = null;
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

    const saved = localStorage.getItem('editingCompany');
    if (saved) this.companyData = JSON.parse(saved);

    this.buildForm();

    if (this.companyData?.companyAddress) {
    this.addressForm.patchValue(this.companyData.companyAddress);
  } else if (this.companyData) {
    this.addressForm.patchValue(this.companyData);
  }
  }

  wordLimitValidator(limit: number) {
    return (control: any) => {
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
    value = value.replace(/[0-9]/g, ''); // remove digits
    this.addressForm.get('city')?.setValue(value, { emitEvent: false });
  }

  // STATE – No digits
  onStateInput() {
    let value = this.addressForm.get('stateProvince')?.value || '';
    value = value.replace(/[0-9]/g, ''); // remove digits
    this.addressForm.get('stateProvince')?.setValue(value, { emitEvent: false });
  }

  // POSTAL CODE – Only digits + max 6
  onPostalInput() {
    let value = this.addressForm.get('postalCode')?.value || '';
    value = value.replace(/\D/g, '').slice(0, 6);
    this.addressForm.get('postalCode')?.setValue(value, { emitEvent: false });
  }

  // PHONE – Only digits + max 10
  onPhoneInput() {
    let value = this.addressForm.get('primaryContactPhone')?.value || '';
    value = value.replace(/\D/g, '').slice(0, 10);
    this.addressForm.get('primaryContactPhone')?.setValue(value, { emitEvent: false });
  }

  // EMAIL – always lowercase
  onEmailInput() {
    let value = this.addressForm.get('primaryContactEmail')?.value || '';
    this.addressForm.get('primaryContactEmail')?.setValue(value.toLowerCase(), {
      emitEvent: false,
    });
  }

  // -----------------------
  // SAVE ADDRESS
  // -----------------------
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

    this.isSaving = true; // START SPINNER

    this.companyService.createAddress(this.companyId, payload).subscribe({
      next: (res) => {
        this.isSaving = false; // STOP SPINNER

        const updated = { ...(this.companyData || {}), ...payload };
        localStorage.setItem('editingCompany', JSON.stringify(updated));
        this.companyService.setEditingCompany(updated);
        this.companyData = updated;

        this.router.navigate([`/admin/company/add/step-3`]);
      },
      error: (err) => {
        this.isSaving = false; // STOP SPINNER ON ERROR
        console.error('Address API failed', err);
      },
    });
  }

  private persistEditAddress(force = false) {
    if (!this.isEditMode || !this.addressForm) return;
    if (!force && !this.addressForm.dirty) return;

    const updated = {
      ...(this.companyData || {}),
      ...this.addressForm.value,
    };

    localStorage.setItem('editingCompany', JSON.stringify(updated));
    this.companyService.setEditingCompany(updated);
    this.companyData = updated;
  }

  ngOnDestroy() {
    this.persistEditAddress();
  }
}
