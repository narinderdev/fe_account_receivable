import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { CompanySelectionService } from '../../services/company-selection.service';
import {
  RoleService,
  SecurityReportByObjectResponse,
  SecurityReportByRoleResponse,
} from '../../services/role-service';
import { Loader } from '../../shared/loader/loader';

/** ===== Models ===== */
type Permission = string;

export interface RolePermissionRow {
  roleName: string;
  objectName: string;
  permissions: Permission[];
}

type ViewMode = 'ROLE' | 'OBJECT';

interface TableRow {
  primary: string;
  secondary: string;
  permissions: string[];
}

/** ===== Component ===== */
@Component({
  selector: 'app-security-report',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './security-report.html',
  styleUrls: ['./security-report.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityReport implements OnInit, OnDestroy {
  private roleService = inject(RoleService);
  private companySelection = inject(CompanySelectionService);

  private destroy$ = new Subject<void>();
  private pendingRequests = 0;
  private activeCompanyId: number | null = null;

  private roleRows = signal<RolePermissionRow[]>([]);
  private objectRows = signal<RolePermissionRow[]>([]);
  private readonly permissionPriority = [
    'VIEW',
    'CREATE',
    'UPDATE',
    'EDIT',
    'DELETE',
    'APPROVE',
    'APPLY',
    'SEND',
    'INVITE_USER',
  ];

  viewMode = signal<ViewMode>('ROLE');
  selectedRole = signal<string>('');    
  selectedObject = signal<string>('');  
  currentPage = signal(0);

  loading = signal<boolean>(false);
  showExportMenu = signal<boolean>(false);
  readonly pageSize = 10;
  math = Math;

  roleOptions = computed(() => {
    const set = new Set(this.roleRows().map((r) => r.roleName));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  objectOptions = computed(() => {
    const set = new Set(this.objectRows().map((r) => r.objectName));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  permissionColumns = computed(() => {
    const collected = new Set<string>();
    [...this.roleRows(), ...this.objectRows()].forEach((row) =>
      (row.permissions || []).forEach((perm) => perm && collected.add(perm)),
    );

    const ordered: string[] = [];
    this.permissionPriority.forEach((perm) => {
      if (collected.has(perm)) {
        ordered.push(perm);
        collected.delete(perm);
      }
    });

    return [...ordered, ...Array.from(collected).sort()];
  });

  tableRows = computed<TableRow[]>(() => {
    const mode = this.viewMode();
    const rows = mode === 'ROLE' ? this.roleRows() : this.objectRows();

    if (mode === 'ROLE') {
      const role = this.selectedRole();
      if (!role) return [];
      return rows
        .filter((r) => r.roleName === role)
        .sort((a, b) => a.objectName.localeCompare(b.objectName))
        .map((r) => ({
          primary: r.roleName,
          secondary: r.objectName,
          permissions: r.permissions,
        }));
    }
    const obj = this.selectedObject();
    if (!obj) return [];
    return rows
      .filter((r) => r.objectName === obj)
      .sort((a, b) => a.roleName.localeCompare(b.roleName))
      .map((r) => ({
        primary: r.objectName,
        secondary: r.roleName,
        permissions: r.permissions,
      }));
  });

  primaryHeader = computed(() => (this.viewMode() === 'ROLE' ? 'Role' : 'Object'));
  secondaryHeader = computed(() => (this.viewMode() === 'ROLE' ? 'Object' : 'Role'));
  totalPages = computed(() => Math.ceil(this.tableRows().length / this.pageSize) || 0);
  paginatedRows = computed(() => {
    const start = this.currentPage() * this.pageSize;
    return this.tableRows().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.companySelection.selectedCompanyId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((companyIdValue) => {
        const parsed = companyIdValue ? Number(companyIdValue) : NaN;
        const nextCompanyId = Number.isFinite(parsed) ? parsed : null;
        this.activeCompanyId = nextCompanyId;

        if (!this.activeCompanyId) {
          this.resetState();
          return;
        }

        this.fetchRoleView(this.activeCompanyId);
        if (this.viewMode() === 'OBJECT') {
          this.fetchObjectView(this.activeCompanyId);
        } else {
          this.ensureSelection('ROLE');
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeExportMenu();
  }

  onToggle(mode: ViewMode) {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);

    if (mode === 'ROLE') {
      this.selectedObject.set('');
      if (this.roleRows().length === 0 && this.activeCompanyId) {
        this.fetchRoleView(this.activeCompanyId);
      } else {
        this.ensureSelection('ROLE');
      }
    } else {
      this.selectedRole.set('');
      if (this.objectRows().length === 0 && this.activeCompanyId) {
        this.fetchObjectView(this.activeCompanyId);
      } else {
        this.ensureSelection('OBJECT');
      }
    }
    this.resetPagination();
  }

  onRoleChange(value: string) {
    this.selectedRole.set(value);
    this.resetPagination();
  }

  onObjectChange(value: string) {
    this.selectedObject.set(value);
    this.resetPagination();
  }

  toggleExportMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showExportMenu.update((current) => !current);
  }

  onDropdownClick(event: MouseEvent) {
    event.stopPropagation();
  }

  private closeExportMenu() {
    this.showExportMenu.set(false);
  }

  exportExcel() {
    this.closeExportMenu();
    // TODO: wire to backend or client-side export lib
    // For now we just show what would be exported
    const payload = this.buildExportPayload();
    console.log('EXPORT EXCEL payload:', payload);
    alert('Excel export (stub). Check console for payload.');
  }

  exportPdf() {
    this.closeExportMenu();
    // TODO: wire to backend or client-side export lib (jspdf, pdfmake, etc.)
    const payload = this.buildExportPayload();
    console.log('EXPORT PDF payload:', payload);
    alert('PDF export (stub). Check console for payload.');
  }

  private buildExportPayload() {
    return {
      viewMode: this.viewMode(),
      selectedRole: this.selectedRole(),
      selectedObject: this.selectedObject(),
      rows: this.tableRows(),
      generatedAt: new Date().toISOString(),
    };
  }

  private fetchRoleView(companyId: number) {
    this.beginLoading();
    this.roleService
      .getSecurityReportByRole(companyId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.endLoading()),
      )
      .subscribe({
        next: (response: SecurityReportByRoleResponse) => {
          if (this.activeCompanyId !== companyId) {
            return;
          }
          const rows = this.flattenRoleResponse(response?.data ?? []);
          this.roleRows.set(rows);
          this.ensureSelection('ROLE');
        },
        error: (error) => {
          console.error('Failed to load role security report', error);
          this.roleRows.set([]);
        },
      });
  }

  private fetchObjectView(companyId: number) {
    this.beginLoading();
    this.roleService
      .getSecurityReportByObject(companyId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.endLoading()),
      )
      .subscribe({
        next: (response: SecurityReportByObjectResponse) => {
          if (this.activeCompanyId !== companyId) {
            return;
          }
          const rows = this.flattenObjectResponse(response?.data ?? {});
          this.objectRows.set(rows);
          this.ensureSelection('OBJECT');
        },
        error: (error) => {
          console.error('Failed to load object security report', error);
          this.objectRows.set([]);
        },
      });
  }

  private flattenRoleResponse(entries: SecurityReportByRoleResponse['data']): RolePermissionRow[] {
    const rows: RolePermissionRow[] = [];
    entries.forEach((entry) => {
      const roleName = entry.role;
      Object.entries(entry.objects || {}).forEach(([objectName, permissions]) => {
        rows.push({
          roleName,
          objectName,
          permissions: (permissions ?? []).map((perm) => this.normalizePermission(perm)),
        });
      });
    });
    return rows;
  }

  private flattenObjectResponse(map: SecurityReportByObjectResponse['data']): RolePermissionRow[] {
    const rows: RolePermissionRow[] = [];
    Object.entries(map || {}).forEach(([objectName, roleMap]) => {
      Object.entries(roleMap || {}).forEach(([roleName, permissions]) => {
        rows.push({
          roleName,
          objectName,
          permissions: (permissions ?? []).map((perm) => this.normalizePermission(perm)),
        });
      });
    });
    return rows;
  }

  private ensureSelection(mode: ViewMode) {
    if (mode === 'ROLE') {
      const options = this.roleOptions();
      if (!options.length) {
        this.selectedRole.set('');
        this.resetPagination();
        return;
      }
      if (!options.includes(this.selectedRole())) {
        this.selectedRole.set(options[0]);
      }
    } else {
      const options = this.objectOptions();
      if (!options.length) {
        this.selectedObject.set('');
        this.resetPagination();
        return;
      }
      if (!options.includes(this.selectedObject())) {
        this.selectedObject.set(options[0]);
      }
    }
    this.resetPagination();
  }

  private resetState() {
    this.roleRows.set([]);
    this.objectRows.set([]);
    this.selectedRole.set('');
    this.selectedObject.set('');
    this.loading.set(false);
    this.resetPagination();
  }

  private beginLoading() {
    this.pendingRequests += 1;
    this.loading.set(true);
  }

  private endLoading() {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    if (this.pendingRequests === 0) {
      this.loading.set(false);
    }
  }

  private resetPagination() {
    this.currentPage.set(0);
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 0; i < total; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(0);
    if (current <= 2) {
      pages.push(1, 2, 3, -1, total - 1);
    } else if (current >= total - 3) {
      pages.push(-1, total - 4, total - 3, total - 2, total - 1);
    } else {
      pages.push(-1, current - 1, current, current + 1, -1, total - 1);
    }

    return pages;
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 0) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  hasPermission(permissions: string[], perm: string): boolean {
    return permissions?.includes(perm) ?? false;
  }

  formatRoleLabel(value: string): string {
    return this.formatLabel(value);
  }

  formatObjectLabel(value: string): string {
    return this.formatLabel(value);
  }

  formatPermissionLabel(value: string): string {
    return this.formatLabel(value);
  }

  private formatLabel(value: string): string {
    if (!value) return '';
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((segment) => {
        if (!segment) return '';
        if (segment.length <= 2) {
          return segment.toUpperCase();
        }
        return segment.charAt(0).toUpperCase() + segment.slice(1);
      })
      .join(' ');
  }

  private normalizePermission(value: string | undefined | null): string {
    const normalized = (value ?? '').trim().toUpperCase();
    if (normalized === 'EDIT') {
      return 'UPDATE';
    }
    return normalized;
  }
}
