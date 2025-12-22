import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { UserContextService } from '../../services/user-context.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  setupOpen = false;
  mobileMenuOpen = false;
  mobileSetupOpen = false;
  canViewDashboard = false;
  canViewCustomers = false;
  canViewInvoices = false;
  canViewPayments = false;
  canViewReports = false;
  canViewCollections = false;
  canViewCompany = false;
  canViewUsers = false;
  canViewRoles = false;
  showSetupLinks = false;

  constructor(private router: Router, private userContext: UserContextService) {
    this.refreshPermissions();
  }

  private refreshPermissions() {
    this.canViewDashboard = this.userContext.hasPermission('VIEW_DASHBOARD');
    this.canViewCustomers = this.userContext.hasPermission('VIEW_CUSTOMERS');
    this.canViewInvoices = this.userContext.hasPermission('VIEW_INVOICES');
    this.canViewPayments = this.userContext.hasPermission('VIEW_PAYMENTS');
    this.canViewReports = this.userContext.hasPermission('VIEW_AGING_REPORTS');
    this.canViewCollections = this.userContext.hasPermission('VIEW_PROMISE_TO_PAY');
    this.canViewCompany = this.userContext.hasPermission('VIEW_COMPANY');
    this.canViewUsers = this.userContext.hasPermission('VIEW_USER');
    this.canViewRoles = this.userContext.hasPermission('VIEW_ROLES');
    this.showSetupLinks =
      this.userContext.isAdmin() || this.canViewCompany || this.canViewUsers || this.canViewRoles;
  }

  toggleSetup() {
    this.setupOpen = !this.setupOpen;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    this.mobileSetupOpen = false;
  }

  toggleMobileSetup(event: Event) {
    event.stopPropagation();
    this.mobileSetupOpen = !this.mobileSetupOpen;
  }

  signOut() {
    this.closeMobileMenu();
    localStorage.clear();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
