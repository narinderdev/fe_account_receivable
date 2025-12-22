import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CompanyUser, Role } from '../../models/company-users.model';
import { CompanyService } from '../../services/company-service';
import { RoleService } from '../../services/role-service';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner],
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
})
export class Users implements OnInit, OnDestroy {
  isModalOpen = false;
  inviteForm!: FormGroup;
  submitted = false;
  isSavingInvite = false;

  roles: Role[] = [];
  users: CompanyUser[] = [];

  companyId: number | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private companySelection: CompanySelectionService,
    private roleService: RoleService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.inviteForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      roleIds: ['', Validators.required],
      // status: ['', Validators.required],
    });

    this.listenForCompanySelection();
  }

  private listenForCompanySelection() {
    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        const parsed = id ? Number(id) : NaN;
        const nextCompanyId = Number.isFinite(parsed) ? parsed : null;

        if (this.companyId === nextCompanyId) {
          return;
        }

        this.companyId = nextCompanyId;

        if (this.companyId) {
          this.loadRoles(this.companyId);
          this.loadUsers();
        } else {
          this.users = [];
          this.roles = [];
          this.cdr.detectChanges();
        }
      });
  }

  loadUsers() {
    if (!this.companyId) return;

    this.companyService.getUsers(this.companyId).subscribe({
      next: (res) => {
        this.users = res.data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.users = [];
        this.cdr.detectChanges();
      },
    });
  }

  loadRoles(companyId: number) {
    this.roleService.getRoles(companyId).subscribe({
      next: (res) => {
        this.roles = res?.data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load roles', err),
    });
  }

  openModal() {
    if (!this.companyId) {
      this.toastr.error('Please select a company first.');
      return;
    }
    this.inviteForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      roleIds: '',
    });
    this.submitted = false;
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.isModalOpen = false;
    this.cdr.detectChanges();
  }

  sendInvite() {
    this.submitted = true;
    if (this.inviteForm.invalid || this.isSavingInvite) return;
    if (!this.companyId) return;

    this.isSavingInvite = true;
    this.cdr.detectChanges();

    const payload = {
      firstName: this.inviteForm.value.firstName,
      lastName: this.inviteForm.value.lastName,
      email: this.inviteForm.value.email,
      // status: this.inviteForm.value.status,
      roleIds: [Number(this.inviteForm.value.roleIds)],
    };

    this.companyService.inviteUser(this.companyId, payload).subscribe({
      next: (res) => {
        const newUser = res.data;

        this.users = [...this.users, newUser];
        this.isSavingInvite = false;
        this.submitted = false;
        this.inviteForm.reset();
        this.isModalOpen = false;

        this.toastr.success('User invited successfully.');

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Invite failed', err);
        this.isSavingInvite = false;
        this.toastr.error('Failed to invite user.');
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getUserName(user: CompanyUser): string {
    if (user?.name && user.name.trim().length) {
      return user.name.trim();
    }
    const combined = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return combined || '--';
  }

  getUserRole(user: CompanyUser): string {
    const assignments = user?.userRoles
      ?.map((entry) => entry?.role?.name)
      .filter((name): name is string => !!name);
    if (assignments && assignments.length) {
      return assignments.join(', ');
    }
    return user?.role?.name || '--';
  }

  getUserStatus(user: CompanyUser): string {
    const status = user?.status || '';
    if (!status) return '--';
    const lower = status.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  isUserActive(user: CompanyUser): boolean {
    return (user?.status || '').toUpperCase() === 'ACTIVE';
  }

  isUserInactive(user: CompanyUser): boolean {
    return (user?.status || '').toUpperCase() === 'INACTIVE';
  }

  isUserInvited(user: CompanyUser): boolean {
    return (user?.status || '').toUpperCase() === 'INVITED';
  }

  getUserInitial(user: CompanyUser): string {
    const name = this.getUserName(user);
    if (!name || name === '--') {
      return '?';
    }
    return name.trim().charAt(0).toUpperCase();
  }

  getInitialColor(index: number): { background: string; color: string } {
    const palette = [
      { background: '#DBEAFE', color: '#2563EB' },
      { background: '#F3E8FF', color: '#9333EA' },
      { background: '#FFEDD5', color: '#EA580C' },
      { background: '#FEE2E2', color: '#DC2626' },
      { background: '#E0E7FF', color: '#4F46E5' },
      { background: '#CCFBF1', color: '#0D9488' },
    ];
    const colorIndex = index % palette.length;
    return palette[colorIndex];
  }

  getStatusClass(user: CompanyUser): string {
    if (this.isUserActive(user)) {
      return 'status-open';
    }
    if (this.isUserInactive(user)) {
      return 'status-partial';
    }
    if (this.isUserInvited(user)) {
      return 'status-paid';
    }
    return 'status-default';
  }
}
