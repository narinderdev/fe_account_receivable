import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { UserContextService } from '../../services/user-context.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  setupOpen = false;
  reportsOpen = false;
  securityOpen = false;
  mobileMenuOpen = false;
  mobileSetupOpen = false;
  mobileReportsOpen = false;
  mobileSecurityOpen = false;
  arReportsActive = false;
  securityActive = false;
  canViewDashboard = false;
  canViewCustomers = false;
  canViewInvoices = false;
  canViewPayments = false;
  canViewIntegration = false;
  canViewReports = false;
  canViewCollections = false;
  canViewCompany = false;
  canViewAccounts = false;
  canViewUsers = false;
  canViewRoles = false;
  canViewArCodes = false;
  canViewGlCodes = false;
  canViewCreditMemo = false;
  canViewPaymentTerms = false;
  showSetupLinks = false;
  showSecurityLinks = false;
  canViewSecurityReport = false;  
  canManageMfa = false;

  constructor(
    private router: Router,
    private userContext: UserContextService,
  ) {
    this.refreshPermissions();
    this.updateArReportsState();
    this.updateSecurityState();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateArReportsState();
        this.updateSecurityState();
      }
    });
  }

  private refreshPermissions() {
    this.canViewDashboard = this.userContext.hasPermission('VIEW_DASHBOARD');
    this.canViewCustomers = this.userContext.hasPermission('VIEW_CUSTOMERS');
    this.canViewInvoices = this.userContext.hasPermission('VIEW_INVOICES');
    this.canViewPayments = this.userContext.hasPermission('VIEW_PAYMENTS');
    this.canViewIntegration =
      this.userContext.hasPermission('VIEW_INTEGRATIONS') || this.userContext.isAdmin();
    this.canViewReports = this.userContext.hasPermission('VIEW_AGING_REPORTS');
    const collectionsPerms = [
      'VIEW_PROMISE_TO_PAY',
      'CREATE_PROMISE_TO_PAY',
      'VIEW_DISPUTE',
      'CREATE_DISPUTE',
      'VIEW_WRITE_OFF',
      'CREATE_WRITE_OFF',
      'APPROVE_WRITE_OFF',
    ];
    this.canViewCollections = collectionsPerms.some((perm) => this.userContext.hasPermission(perm));
    this.canViewCompany = this.userContext.hasPermission('VIEW_COMPANY');
    this.canViewAccounts =
      this.userContext.hasPermission('VIEW_BANK_ACCOUNT') || this.canViewCompany;
    this.canViewUsers = this.userContext.hasPermission('VIEW_USER');
    this.canViewRoles = this.userContext.hasPermission('VIEW_ROLES');
    const canViewArCodes = this.userContext.hasPermission('VIEW_AR_CODE');
    const canViewGlCodes = this.userContext.hasPermission('VIEW_GL_CODE');
    this.canViewArCodes = canViewArCodes;
    this.canViewGlCodes = canViewGlCodes;
    this.canViewCreditMemo = this.userContext.hasPermission('VIEW_MEMOS');
    this.canViewPaymentTerms =
      this.userContext.hasPermission('VIEW_PAYMENT_TERMS') || this.userContext.isAdmin();
    this.canViewSecurityReport = this.userContext.hasPermission('VIEW_SECURITY_REPORT');
    this.canManageMfa =
      this.userContext.hasPermission('MANAGE_MFA') ||
      this.userContext.hasPermission('VIEW_MFA') ||
      this.canViewUsers ||
      this.canViewRoles ||
      this.userContext.isAdmin();


    // Security section visibility
    this.showSecurityLinks =
      this.canViewUsers || this.canViewRoles || this.canViewSecurityReport || this.canManageMfa;

    this.showSetupLinks =
      this.userContext.isAdmin() ||
      this.canViewCompany ||
      this.canViewArCodes ||
      this.canViewGlCodes ||
      this.canViewAccounts ||
      this.canViewPaymentTerms;
  }

  toggleSetup() {
    const shouldOpen = !this.setupOpen;
    this.setupOpen = shouldOpen;
    if (shouldOpen) {
      this.reportsOpen = false;
      this.securityOpen = false;
    }
  }

  toggleReports() {
    const shouldOpen = !this.reportsOpen;
    this.reportsOpen = shouldOpen;
    if (shouldOpen) {
      this.setupOpen = false;
      this.securityOpen = false;
    }
  }

  toggleSecurity() {
    const shouldOpen = !this.securityOpen;
    this.securityOpen = shouldOpen;
    if (shouldOpen) {
      this.setupOpen = false;
      this.reportsOpen = false;
    }
  }

  handleNavClick() {
    this.setupOpen = false;
    this.reportsOpen = false;
    this.securityOpen = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    this.mobileSetupOpen = false;
    this.mobileReportsOpen = false;
    this.mobileSecurityOpen = false;
  }

  toggleMobileSetup(event: Event) {
    event.stopPropagation();
    const shouldOpen = !this.mobileSetupOpen;
    this.mobileSetupOpen = shouldOpen;
    if (shouldOpen) {
      this.mobileReportsOpen = false;
      this.mobileSecurityOpen = false;
    }
  }

  toggleMobileReports(event: Event) {
    event.stopPropagation();
    const shouldOpen = !this.mobileReportsOpen;
    this.mobileReportsOpen = shouldOpen;
    if (shouldOpen) {
      this.mobileSetupOpen = false;
      this.mobileSecurityOpen = false;
    }
  }

  toggleMobileSecurity(event: Event) {
    event.stopPropagation();
    const shouldOpen = !this.mobileSecurityOpen;
    this.mobileSecurityOpen = shouldOpen;
    if (shouldOpen) {
      this.mobileSetupOpen = false;
      this.mobileReportsOpen = false;
    }
  }

  private updateArReportsState() {
    this.arReportsActive =
      this.router.url.includes('/admin/ar-reports') ||
      this.router.url.includes('/admin/invoices-reports') ||
      this.router.url.includes('/admin/payment-reports');
    this.reportsOpen = this.arReportsActive || this.reportsOpen;
    this.mobileReportsOpen = this.arReportsActive || this.mobileReportsOpen;
  }

  private updateSecurityState() {
    this.securityActive =
      this.router.url.includes('/admin/users') ||
      this.router.url.includes('/admin/roles') ||
      this.router.url.includes('/admin/security-report') ||
      this.router.url.includes('/admin/mfa');
    this.securityOpen = this.securityActive || this.securityOpen;
    this.mobileSecurityOpen = this.securityActive || this.mobileSecurityOpen;
  }

  signOut() {
    this.closeMobileMenu();
    localStorage.clear();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
