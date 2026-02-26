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
import { CompanyService } from '../../services/company-service';
import {
  RoleService,
  SecurityReportByObjectResponse,
  SecurityReportByRoleResponse,
} from '../../services/role-service';
import { Loader } from '../../shared/loader/loader';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

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
  private companyService = inject(CompanyService);

  private destroy$ = new Subject<void>();
  private pendingRequests = 0;
  private activeCompanyId: number | null = null;
  private activeCompanyCode: string | null = null;

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
      // If empty string or "ALL", show all rows
      if (!role || role === 'ALL') {
        return rows
          .sort((a, b) => {
            const roleCompare = a.roleName.localeCompare(b.roleName);
            return roleCompare !== 0 ? roleCompare : a.objectName.localeCompare(b.objectName);
          })
          .map((r) => ({
            primary: r.roleName,
            secondary: r.objectName,
            permissions: r.permissions,
          }));
      }
      // Filter by specific role
      return rows
        .filter((r) => r.roleName === role)
        .sort((a, b) => a.objectName.localeCompare(b.objectName))
        .map((r) => ({
          primary: r.roleName,
          secondary: r.objectName,
          permissions: r.permissions,
        }));
    }

    // Object mode
    const obj = this.selectedObject();
    // If empty string or "ALL", show all rows
    if (!obj || obj === 'ALL') {
      return rows
        .sort((a, b) => {
          const objectCompare = a.objectName.localeCompare(b.objectName);
          return objectCompare !== 0 ? objectCompare : a.roleName.localeCompare(b.roleName);
        })
        .map((r) => ({
          primary: r.objectName,
          secondary: r.roleName,
          permissions: r.permissions,
        }));
    }
    // Filter by specific object
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
        this.activeCompanyCode = null;

        if (!this.activeCompanyId) {
          this.resetState();
          return;
        }

        this.loadCompanyMetadata(this.activeCompanyId);
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

  printReport() {
    this.closeExportMenu();
    window.print();
  }

  private closeExportMenu() {
    this.showExportMenu.set(false);
  }

  exportCsv() {
    this.closeExportMenu();
    const rows = this.tableRows();
    if (rows.length === 0) {
      alert('No data to export');
      return;
    }

    const permissions = this.permissionColumns();
    const headers = [
      'AR Company Code',
      this.primaryHeader(),
      this.secondaryHeader(),
      ...permissions.map((p) => this.formatPermissionLabel(p)),
    ];

    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    const companyCodeValue = this.escapeCsvValue(this.getActiveCompanyCode() || 'N/A');
    rows.forEach((row) => {
      const primary = this.viewMode() === 'ROLE' 
        ? this.formatRoleLabel(row.primary) 
        : this.formatObjectLabel(row.primary);
      const secondary = this.viewMode() === 'ROLE'
        ? this.formatObjectLabel(row.secondary)
        : this.formatRoleLabel(row.secondary);

      const permissionValues = permissions.map(perm => 
        this.hasPermission(row.permissions, perm) ? 'Yes' : 'No'
      );

      const rowData = [
        companyCodeValue,
        this.escapeCsvValue(primary),
        this.escapeCsvValue(secondary),
        ...permissionValues
      ];

      csvRows.push(rowData.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, this.getExportFileName('csv'));
  }

  exportExcel() {
    this.closeExportMenu();
    const rows = this.tableRows();
    if (rows.length === 0) {
      alert('No data to export');
      return;
    }

    const permissions = this.permissionColumns();
    const headers = [
      'AR Company Code',
      this.primaryHeader(),
      this.secondaryHeader(),
      ...permissions.map((p) => this.formatPermissionLabel(p)),
    ];

    // Build data array
    const data: any[][] = [];
    data.push(headers);

    const companyCodeValue = this.getActiveCompanyCode() || 'N/A';
    rows.forEach((row) => {
      const primary = this.viewMode() === 'ROLE'
        ? this.formatRoleLabel(row.primary)
        : this.formatObjectLabel(row.primary);
      const secondary = this.viewMode() === 'ROLE'
        ? this.formatObjectLabel(row.secondary)
        : this.formatRoleLabel(row.secondary);

      const permissionValues = permissions.map(perm =>
        this.hasPermission(row.permissions, perm) ? 'Yes' : 'No'
      );

      data.push([companyCodeValue, primary, secondary, ...permissionValues]);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    const colWidths = [
      { wch: 18 }, // Company code column
      { wch: 25 }, // Primary column
      { wch: 25 }, // Secondary column
      ...permissions.map(() => ({ wch: 12 })) // Permission columns
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Security Report');

    // Generate and download
    XLSX.writeFile(wb, this.getExportFileName('xlsx'));
  }

  exportPdf() {
    this.closeExportMenu();
    const rows = this.tableRows();
    if (rows.length === 0) {
      alert('No data to export');
      return;
    }

    const permissions = this.permissionColumns();
    const headers = [
      'AR Company Code',
      this.primaryHeader(),
      this.secondaryHeader(),
      ...permissions.map((p) => this.formatPermissionLabel(p)),
    ];

    // Determine orientation based on number of columns
    const orientation = permissions.length > 5 ? 'landscape' : 'portrait';
    const doc = new jsPDF({
      orientation: orientation as any,
      unit: 'mm',
      format: 'a4'
    });

    // Get page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const usableWidth = pageWidth - (margin * 2);

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Security Report', margin, 15);

    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const subtitle = this.viewMode() === 'ROLE'
      ? `Role: ${this.formatRoleLabel(this.selectedRole()) || 'All Roles'}`
      : `Object: ${this.formatObjectLabel(this.selectedObject()) || 'All Objects'}`;
    doc.text(subtitle, margin, 22);
    const companyCode = this.getActiveCompanyCode();
    if (companyCode) {
      doc.text(`Company Code: ${companyCode}`, margin, 27);
    }

    // Table settings
    const startY = companyCode ? 36 : 30;
    const rowHeight = 8;
    const headerHeight = 10;
    const fontSize = 8;
    const cellPadding = 2;

    // Calculate column widths
    const companyColWidth = usableWidth * 0.2;
    const primaryColWidth = usableWidth * 0.25;
    const secondaryColWidth = usableWidth * 0.25;
    const remainingWidth = Math.max(usableWidth - companyColWidth - primaryColWidth - secondaryColWidth, 0);
    const permColWidth = permissions.length ? remainingWidth / permissions.length : 0;

    const columnWidths = [
      companyColWidth,
      primaryColWidth,
      secondaryColWidth,
      ...permissions.map(() => permColWidth),
    ];

    let currentY = startY;

    // Draw header
    doc.setFillColor(59, 130, 246); // Blue header
    doc.setTextColor(255, 255, 255); // White text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);

    let currentX = margin;
    headers.forEach((header, index) => {
      const colWidth = columnWidths[index];
      doc.rect(currentX, currentY, colWidth, headerHeight, 'F');
      
      // Center text in cell
      const textWidth = doc.getTextWidth(header);
      const textX = currentX + (colWidth - textWidth) / 2;
      const textY = currentY + headerHeight / 2 + 2;
      doc.text(header, textX, textY);
      
      currentX += colWidth;
    });

    currentY += headerHeight;

    // Draw data rows
    doc.setTextColor(0, 0, 0); // Black text
    doc.setFont('helvetica', 'normal');

    rows.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (currentY + rowHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;

        // Redraw header on new page
        doc.setFillColor(59, 130, 246);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        
        currentX = margin;
        headers.forEach((header, index) => {
          const colWidth = columnWidths[index];
          doc.rect(currentX, currentY, colWidth, headerHeight, 'F');
          const textWidth = doc.getTextWidth(header);
          const textX = currentX + (colWidth - textWidth) / 2;
          const textY = currentY + headerHeight / 2 + 2;
          doc.text(header, textX, textY);
          currentX += colWidth;
        });

        currentY += headerHeight;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
      }

      // Alternate row colors
      if (rowIndex % 2 === 0) {
        doc.setFillColor(249, 250, 251); // Light gray
        currentX = margin;
        columnWidths.forEach(colWidth => {
          doc.rect(currentX, currentY, colWidth, rowHeight, 'F');
          currentX += colWidth;
        });
      }

      // Draw cell borders
      currentX = margin;
      columnWidths.forEach(colWidth => {
        doc.rect(currentX, currentY, colWidth, rowHeight, 'S');
        currentX += colWidth;
      });

      // Draw cell content
      currentX = margin;
      
      // Company code column
      doc.setFont('helvetica', 'normal');
      const companyValue = this.getActiveCompanyCode() || 'N/A';
      const companyTruncated = this.truncateText(doc, companyValue, columnWidths[0] - cellPadding * 2);
      doc.text(companyTruncated, currentX + cellPadding, currentY + rowHeight / 2 + 2);
      currentX += columnWidths[0];

      // Primary column (bold)
      doc.setFont('helvetica', 'bold');
      const primary = this.viewMode() === 'ROLE'
        ? this.formatRoleLabel(row.primary)
        : this.formatObjectLabel(row.primary);
      const primaryTruncated = this.truncateText(doc, primary, columnWidths[1] - cellPadding * 2);
      doc.text(primaryTruncated, currentX + cellPadding, currentY + rowHeight / 2 + 2);
      currentX += columnWidths[1];

      // Secondary column (normal)
      doc.setFont('helvetica', 'normal');
      const secondary = this.viewMode() === 'ROLE'
        ? this.formatObjectLabel(row.secondary)
        : this.formatRoleLabel(row.secondary);
      const secondaryTruncated = this.truncateText(doc, secondary, columnWidths[2] - cellPadding * 2);
      doc.text(secondaryTruncated, currentX + cellPadding, currentY + rowHeight / 2 + 2);
      currentX += columnWidths[2];

      // Permission columns (centered)
      permissions.forEach((perm, permIndex) => {
        const hasPermission = this.hasPermission(row.permissions, perm);
        const value = hasPermission ? 'Yes' : 'No';
        const textWidth = doc.getTextWidth(value);
        const columnWidth = columnWidths[permIndex + 3] ?? 0;
        const textX = currentX + (columnWidth - textWidth) / 2;
        doc.text(value, textX, currentY + rowHeight / 2 + 2);
        currentX += columnWidth;
      });

      currentY += rowHeight;
    });

    // Save PDF
    doc.save(this.getExportFileName('pdf'));
  }

  private truncateText(doc: jsPDF, text: string, maxWidth: number): string {
    if (doc.getTextWidth(text) <= maxWidth) {
      return text;
    }

    let truncated = text;
    while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }

    return truncated + '...';
  }

  private getExportFileName(extension: string): string {
    const date = new Date().toISOString().split('T')[0];
    const mode = this.viewMode() === 'ROLE' ? 'by-role' : 'by-object';
    const codeSegment = this.getCompanyCodeForFileName();
    const base = codeSegment
      ? `security-report-${codeSegment}-${mode}-${date}`
      : `security-report-${mode}-${date}`;
    return `${base}.${extension}`;
  }

  private escapeCsvValue(value: string): string {
    if (!value) return '';
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private downloadBlob(blob: Blob, filename: string) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      // Default to "All Roles" (empty string) to show all data
      if (!this.selectedRole() || !options.includes(this.selectedRole())) {
        this.selectedRole.set('');
      }
    } else {
      const options = this.objectOptions();
      if (!options.length) {
        this.selectedObject.set('');
        this.resetPagination();
        return;
      }
      // Default to "All Objects" (empty string) to show all data
      if (!this.selectedObject() || !options.includes(this.selectedObject())) {
        this.selectedObject.set('');
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
    this.activeCompanyCode = null;
  }

  private loadCompanyMetadata(companyId: number) {
    this.companyService
      .getCompanyById(companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (this.activeCompanyId !== companyId) {
            return;
          }
          const code = response?.data?.companyCode?.trim();
          this.activeCompanyCode = code || null;
        },
        error: () => {
          if (this.activeCompanyId === companyId) {
            this.activeCompanyCode = null;
          }
        },
      });
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

  getActiveCompanyCode(): string | null {
    const trimmed = this.activeCompanyCode?.trim();
    return trimmed ? trimmed : null;
  }

  private getCompanyCodeForFileName(): string | null {
    const code = this.getActiveCompanyCode();
    if (!code) {
      return null;
    }
    const sanitized = code.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
    return sanitized || null;
  }
}
