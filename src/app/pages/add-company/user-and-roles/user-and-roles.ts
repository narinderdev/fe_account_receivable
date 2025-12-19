import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CompanyService } from '../../../services/company-service';
import { Subject, takeUntil } from 'rxjs';
import { Spinner } from '../../../shared/spinner/spinner';
import { ToastService } from '../../../shared/toast/toast-service';

@Component({
  selector: 'app-user-and-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Spinner],
  templateUrl: './user-and-roles.html',
  styleUrls: ['./user-and-roles.css'],
})
export class UserAndRoles implements OnInit, OnDestroy {
  isModalOpen = false;
  inviteForm!: FormGroup;
  submitted = false;
  isSavingInvite = false;
  isSubmittingFinal = false;

  roles: any[] = [];
  users: any[] = [];

  isEditMode = false;
  companyId!: number;
  companyData: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Detect Edit Mode (from /admin/company/edit/:id)
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

      this.users = this.companyData?.users || [];
    } else {
      // ADD MODE
      this.companyId = Number(localStorage.getItem('companyId'));
    }

    // Build invite form
    this.inviteForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      roleId: ['', Validators.required],
      status: ['', Validators.required],
    });

    this.loadRoles();

    // Live sync for editing mode
    if (this.isEditMode) {
      this.companyService.editingCompany$.pipe(takeUntil(this.destroy$)).subscribe((data) => {
        if (data?.id === this.companyId) {
          this.companyData = data;
          this.users = data.users || [];
        }
      });
    }
  }

  // Load roles from API
  loadRoles() {
    this.companyService.getRoles().subscribe({
      next: (res) => (this.roles = res?.data || []),
      error: (err) => console.error('Failed to load roles', err),
    });
  }

  // Modal controls
  openModal() {
    this.inviteForm.reset();
    this.submitted = false;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  // Invite User API
  // Replace your sendInvite() method with this fixed version:

sendInvite() {
  this.submitted = true;
  if (this.inviteForm.invalid || this.isSavingInvite) return;

  this.isSavingInvite = true;

  const payload = {
    users: [
      {
        name: this.inviteForm.value.name,
        email: this.inviteForm.value.email,
        status: this.inviteForm.value.status,
        roleId: Number(this.inviteForm.value.roleId),
      },
    ],
  };

  this.companyService.inviteUser(this.companyId, payload).subscribe({
    next: (res) => {
      console.log('Invite API Response:', res); // Debug log
      
      const updatedCompany = res.data;

      if (this.isEditMode) {
        localStorage.setItem('editingCompany', JSON.stringify(updatedCompany));
        this.companyService.setEditingCompany(updatedCompany);
        this.users = updatedCompany.users || [];
      } else {
        this.users = updatedCompany.users || [];
      }

      // Reset states BEFORE closing modal
      this.isSavingInvite = false;
      this.submitted = false;
      this.inviteForm.reset();
      
      // Close modal
      this.isModalOpen = false;
      
      console.log('Modal should be closed now'); // Debug log
    },

    error: (err) => {
      console.error('Invite failed', err);
      this.isSavingInvite = false;
      // Optionally show an error message to the user
      alert('Failed to invite user. Please try again.');
    },
  });
}

  submitFinal() {
    if (this.isSubmittingFinal) return;

    this.isSubmittingFinal = true;

    if (this.isEditMode) {
      const payload = this.companyService.getChangedCompanyPayload();

      if (!payload || Object.keys(payload).length === 0) {
        this.isSubmittingFinal = false;
        this.router.navigate(['/admin/company']);
        return;
      }

      this.companyService.updateCompany(this.companyId, payload).subscribe({
        next: () => {
          this.isSubmittingFinal = false;

          localStorage.removeItem('editingCompany');
          this.companyService.setEditingCompany(null);
          this.companyService.setOriginalCompany(null);
          this.toastService.show('Company updated successfully.');

          this.router.navigate(['/admin/company']);
        },
        error: (err) => {
          this.isSubmittingFinal = false;
          console.error('Update failed:', err);
          this.toastService.show('Failed to update company.', 'error');
        },
      });

      return;
    }

    this.isSubmittingFinal = false;
    this.router.navigate(['/admin/company/add/complete']);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
