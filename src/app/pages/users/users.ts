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
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { Spinner } from '../../shared/spinner/spinner';
import { UserContextService } from '../../services/user-context.service';
import { Loader } from '../../shared/loader/loader';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Spinner, Loader],
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
})
export class Users implements OnInit, OnDestroy {
  isModalOpen = false;
  isImportModalOpen = false;
  inviteForm!: FormGroup;
  assignRoleForm!: FormGroup;
  submitted = false;
  assignRoleSubmitted = false;
  isSavingInvite = false;
  isLoadingUsers = false;
  approvingUserId: number | null = null;
  isImporting = false;
  selectedImportFile: File | null = null;
  importError = '';
  isAssignRoleModalOpen = false;
  isAssigningRole = false;
  assignRoleError = '';
  userPendingRole: CompanyUser | null = null;

  roles: Role[] = [];
  assignableRoles: Role[] = [];
  users: CompanyUser[] = [];
  private allUsers: CompanyUser[] = [];
  pagination = this.createPagination();
  Math = Math;

  companyId: number | null = null;
  canInviteUser = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private companySelection: CompanySelectionService,
    private roleService: RoleService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private userContext: UserContextService
  ) {
    this.canInviteUser = this.userContext.hasPermission('INVITE_USER');
  }

  ngOnInit() {
    this.inviteForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      roleIds: ['', Validators.required],
      // status: ['', Validators.required],
    });

    this.assignRoleForm = this.fb.group({
      roleId: ['', Validators.required],
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
          this.allUsers = [];
          this.roles = [];
          this.pagination = this.createPagination();
          this.cdr.detectChanges();
        }
      });
  }

  loadUsers() {
    if (!this.companyId) return;

    this.isLoadingUsers = true;
    this.cdr.detectChanges();

    this.companyService
      .getUsers(this.companyId)
      .pipe(
        finalize(() => {
          this.isLoadingUsers = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          this.allUsers = list;
          this.pagination = this.createPagination();
          this.users = this.applyPagination(this.allUsers, 0);
        },
        error: (err) => {
          console.error('Failed to load users', err);
          this.allUsers = [];
          this.users = [];
          this.pagination = this.createPagination();
        },
      });
  }

  loadRoles(companyId: number) {
    this.roleService.getRoles(companyId).subscribe({
      next: (res) => {
        const roleList = Array.isArray(res?.data) ? res.data : [];
        this.roles = roleList;
        this.assignableRoles = this.filterAssignableRoles(roleList);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load roles', err);
        this.roles = [];
        this.assignableRoles = [];
        this.cdr.detectChanges();
      },
    });
  }

  openModal() {
    if (!this.canInviteUser) {
      return;
    }
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

  formatRoleName(name: string | undefined | null): string {
    if (!name) return '';

    return name
      .trim()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/\b(ar)\b/g, 'AR')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }


  closeModal() {
    this.isModalOpen = false;
    this.cdr.detectChanges();
  }

  openImportModal() {
    if (!this.canInviteUser) {
      return;
    }
    if (!this.companyId) {
      this.toastr.error('Please select a company first.');
      return;
    }
    this.importError = '';
    this.selectedImportFile = null;
    this.isImporting = false;
    this.isImportModalOpen = true;
    this.cdr.detectChanges();
  }

  closeImportModal() {
    this.isImportModalOpen = false;
    this.importError = '';
    this.selectedImportFile = null;
    this.isImporting = false;
    this.cdr.detectChanges();
  }

  handleImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.selectedImportFile = null;
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.importError = 'Please upload a CSV file.';
      this.selectedImportFile = null;
      return;
    }
    this.importError = '';
    this.selectedImportFile = file;
  }

  submitImport() {
    if (!this.companyId) {
      this.importError = 'Select a company before importing.';
      return;
    }
    if (!this.selectedImportFile || this.isImporting) {
      this.importError = this.importError || 'Please choose a CSV file.';
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedImportFile);

    this.isImporting = true;
    this.importError = '';
    this.cdr.detectChanges();

    this.companyService.importUsers(this.companyId, formData).subscribe({
      next: (response) => {
        const message = response?.message || 'Users imported successfully.';
        this.toastr.success(message);
        this.isImporting = false;
        this.closeImportModal();
        this.loadUsers();
      },
      error: (error) => {
        const message =
          error?.error?.message || 'Unable to import users. Please verify your file.';
        this.importError = message;
        this.toastr.error(message);
        this.isImporting = false;
        this.cdr.detectChanges();
      },
    });
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
        this.isSavingInvite = false;
        this.submitted = false;
        this.inviteForm.reset();
        this.isModalOpen = false;

        this.toastr.success('User invited successfully.');
        this.loadUsers();

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
      return assignments.map((name) => this.formatRoleName(name)).join(', ');
    }
    const fallback = user?.role?.name;
    return fallback ? this.formatRoleName(fallback) : '--';
  }

  getUserStatus(user: CompanyUser): string {
    const status = user?.status;
    if (!status) {
      return '--';
    }

    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'Active';
      case 'INACTIVE':
        return 'Inactive';
      case 'INVITED':
        return 'Invited';
      default: {
        const normalized = status.toLowerCase().replace(/_/g, ' ');
        return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }

  isUserPending(user: CompanyUser): boolean {
    const status = (user?.status || '').toUpperCase();
    return status.includes('PENDING');
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

  approvePendingUser(user: CompanyUser): void {
    if (!this.companyId || !user?.id) {
      return;
    }
    if (this.approvingUserId === user.id) {
      return;
    }
    if (!this.hasAssignedRole(user)) {
      this.toastr.warning('Please assign a role before approving this user.');
      this.openAssignRoleModal(user);
      return;
    }

    this.approvingUserId = user.id;
    this.cdr.detectChanges();

    this.companyService
      .approveCompanyUser(this.companyId, user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message || 'User approved successfully.', 'Success');
          this.approvingUserId = null;
          this.loadUsers();
        },
        error: (error) => {
          const message = error?.error?.message || 'Unable to approve user.';
          this.toastr.error(message, 'Error');
          this.approvingUserId = null;
          this.cdr.detectChanges();
        },
      });
  }

  hasAssignedRole(user: CompanyUser): boolean {
    const assignedFromUserRoles = user?.userRoles?.some((entry) => !!entry?.role?.id);
    if (assignedFromUserRoles) {
      return true;
    }
    return !!user?.role?.id;
  }

  openAssignRoleModal(user: CompanyUser): void {
    if (!this.companyId) {
      this.toastr.error('Please select a company first.');
      return;
    }
    if (!user?.id) {
      this.toastr.error('Unable to determine the selected user.');
      return;
    }

    const existingRoleId = this.getPrimaryRoleId(user);
    const availableRole = this.assignableRoles.find((role) => role.id === existingRoleId);
    this.assignRoleForm.reset({
      roleId: availableRole ? String(availableRole.id) : '',
    });
    this.assignRoleSubmitted = false;
    this.assignRoleError = '';
    this.userPendingRole = user;
    this.isAssignRoleModalOpen = true;
    this.cdr.detectChanges();
  }

  closeAssignRoleModal(): void {
    this.isAssignRoleModalOpen = false;
    this.userPendingRole = null;
    this.assignRoleSubmitted = false;
    this.assignRoleError = '';
    this.assignRoleForm.reset({ roleId: '' });
    this.cdr.detectChanges();
  }

  submitAssignRole(): void {
    this.assignRoleSubmitted = true;
    if (this.assignRoleForm.invalid || !this.userPendingRole?.id) {
      this.cdr.detectChanges();
      return;
    }

    const payload = {
      userId: this.userPendingRole.id,
      roleId: Number(this.assignRoleForm.value.roleId),
    };

    this.isAssigningRole = true;
    this.assignRoleError = '';
    this.cdr.detectChanges();

    this.companyService
      .assignRoleToUser(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message || 'Role assigned successfully.', 'Success');
          this.isAssigningRole = false;
          this.closeAssignRoleModal();
          this.loadUsers();
        },
        error: (error) => {
          const message = error?.error?.message || 'Unable to assign role.';
          this.assignRoleError = message;
          this.toastr.error(message, 'Error');
          this.isAssigningRole = false;
          this.cdr.detectChanges();
        },
      });
  }

  private getPrimaryRoleId(user: CompanyUser): number | null {
    const fromAssignments = user?.userRoles?.find((entry) => entry?.role?.id)?.role?.id;
    if (fromAssignments) {
      return fromAssignments;
    }
    return user?.role?.id ?? null;
  }

  private filterAssignableRoles(source: Role[]): Role[] {
    return source.filter((role) => !this.isAdminRoleName(role?.name));
  }

  private isAdminRoleName(name: string | undefined | null): boolean {
    if (!name) {
      return false;
    }
    return name.trim().toLowerCase() === 'admin';
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

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const current = this.pagination.currentPage + 1;
    const total = this.pagination.totalPages;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current <= 3) {
        pages.push(2, 3, 4, -1, total);
      } else if (current >= total - 2) {
        pages.push(-1, total - 3, total - 2, total - 1, total);
      } else {
        pages.push(-1, current - 1, current, current + 1, -1, total);
      }
    }

    return pages;
  }

  goToPage(page: number) {
    this.users = this.applyPagination(this.allUsers, page);
  }

  nextPage() {
    if (this.pagination.currentPage < this.pagination.totalPages - 1) {
      this.users = this.applyPagination(this.allUsers, this.pagination.currentPage + 1);
    }
  }

  prevPage() {
    if (this.pagination.currentPage > 0) {
      this.users = this.applyPagination(this.allUsers, this.pagination.currentPage - 1);
    }
  }

  private createPagination(pageSize = 10) {
    return {
      pageSize,
      currentPage: 0,
      totalPages: 0,
      totalItems: 0,
    };
  }

  private applyPagination(source: CompanyUser[], page: number): CompanyUser[] {
    this.pagination.totalItems = source.length;
    this.pagination.totalPages = this.pagination.totalItems
      ? Math.ceil(this.pagination.totalItems / this.pagination.pageSize)
      : 0;

    if (this.pagination.totalPages === 0) {
      this.pagination.currentPage = 0;
      return [];
    }

    this.pagination.currentPage = Math.min(
      Math.max(page, 0),
      this.pagination.totalPages - 1
    );

    const start = this.pagination.currentPage * this.pagination.pageSize;
    return source.slice(start, start + this.pagination.pageSize);
  }
}
