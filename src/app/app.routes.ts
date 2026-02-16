import { Routes } from '@angular/router';
import { Main } from './layout/main/main';
import { Dashboard } from './pages/dashboard/dashboard';
import { Customers } from './pages/customers/customers';
import { AddCustomer } from './pages/add-customer/add-customer';
import { Company } from './pages/company/company';
import { CompanyDetail } from './pages/company/company-detail/company-detail';
import { AddCompany } from './pages/add-company/add-company';

import { BasicInfo } from './pages/add-company/basic-info/basic-info';
import { CompanyAddress } from './pages/add-company/company-address/company-address';
import { FinancialArSettings } from './pages/add-company/financial-ar-settings/financial-ar-settings';
// import { UserAndRoles } from './pages/add-company/user-and-roles/user-and-roles';
import { OnboardingComplete } from './pages/add-company/onboarding-complete/onboarding-complete';

import { Invoices } from './pages/invoices/invoices';
import { CreateInvoice } from './pages/create-invoice/create-invoice';
import { CustomerInvoices } from './pages/customers/customer-invoices/customer-invoices';
import { InvoiceDetail } from './pages/customers/invoice-detail/invoice-detail';
import { Payments } from './pages/payments/payments';
import { CustomerDetail } from './pages/customers/customer-detail/customer-detail';
import { ReceivePayment } from './pages/payments/receive-payment/receive-payment';
import { Users } from './pages/users/users';
import { Roles } from './pages/roles/roles';
import { RolesDetail } from './pages/roles/roles-detail/roles-detail';
import { PaymentDetails } from './pages/payments/payment-details/payment-details';
import { Aging } from './pages/aging/aging';
import { Collections } from './pages/collections/collections';
import { DisputeDetails } from './pages/collections/dispute-details/dispute-details';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { AuthGuard } from './guards/auth.guard';
import { CompanyGuard } from './guards/company.guard';
import { SetPassword } from './pages/set-password/set-password';
import { VerifyOtp } from './pages/verify-otp/verify-otp';
import { VerifyAccountComponent } from './pages/verify-account/verify-account';
import { ArCodes } from './pages/ar-codes/ar-codes';
import { PaymentTerms } from './pages/payment-terms/payment-terms';
import { CreditMemo } from './pages/credit-memo/credit-memo';
import { CreditMemoDetail } from './pages/credit-memo/credit-memo-detail/credit-memo-detail';
import { InvoicesReports } from './pages/invoices-reports/invoices-reports';
import { PaymentsReports } from './pages/payments-reports/payments-reports';
import { GlCode } from './pages/gl-code/gl-code';
import { InvoiceReport } from './pages/invoice-report/invoice-report';
import { PaymentReport } from './pages/payment-report/payment-report';
import { SecurityReport } from './pages/security-report/security-report';
import { MfaComponent } from './pages/mfa/mfa';
import { VerifyAuthenticatorComponent } from './pages/verify-authenticator/verify-authenticator';
import { Accounts } from './pages/accounts/accounts';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: 'verify-otp', component: VerifyOtp },
  { path: 'verify-account', component: VerifyAccountComponent },
  { path: 'verify-authenticator', component: VerifyAuthenticatorComponent },
  { path: 'set-password', component: SetPassword },
  {
    path: 'admin',
    component: Main,
    canActivate: [AuthGuard, CompanyGuard],
    canActivateChild: [AuthGuard, CompanyGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'customer', component: Customers },
      { path: 'customer/add', component: AddCustomer },
      { path: 'customer/edit/:id', component: AddCustomer },
      { path: 'customer/:id', component: CustomerDetail },
      {
        path: 'customer/:customerId/invoices/:invoiceId',
        component: InvoiceDetail,
      },

      { path: 'ar-company', component: Company },
      { path: 'ar-company/details/:id', component: CompanyDetail },
      {
        path: 'ar-company/add',
        component: AddCompany,
        children: [
          { path: '', redirectTo: 'step-1', pathMatch: 'full' },
          { path: 'step-1', component: BasicInfo },
          { path: 'step-2', component: CompanyAddress },
          { path: 'step-3', component: FinancialArSettings },
          // { path: 'step-5', component: UserAndRoles },
          // { path: 'step-6', component: OpeningBalances },
        ],
      },

      // EDIT COMPANY FLOW
      {
        path: 'ar-company/edit/:id',
        component: AddCompany,
        children: [
          { path: '', redirectTo: 'step-1', pathMatch: 'full' },
          { path: 'step-1', component: BasicInfo },
          { path: 'step-2', component: CompanyAddress },
          { path: 'step-3', component: FinancialArSettings },
          // { path: 'step-5', component: UserAndRoles },
        ],
      },

      { path: 'ar-company/onboarding-complete', component: OnboardingComplete },

      // Invoices
      { path: 'invoices', component: Invoices },
      { path: 'invoices/create', component: CreateInvoice },
      { path: 'invoices/detail/:invoiceId', component: InvoiceDetail },

      { path: 'payments', component: Payments },
      { path: 'payments/receive-payment', component: ReceivePayment },
      {
        path: 'payments/details/:paymentType/:paymentId',
        component: PaymentDetails,
      },

      { path: 'users', component: Users },
      { path: 'roles', component: Roles },
      { path: 'roles/details/:roleId', component: RolesDetail },

      { path: 'ar-reports', component: Aging },
      { path: 'invoices-reports', component: InvoiceReport },
      { path: 'payment-reports', component: PaymentReport },
      { path: 'collections', component: Collections },
      { path: 'collections/disputes/:disputeId', component: DisputeDetails },
      { path: 'security-report', component: SecurityReport },
      { path: 'mfa', component: MfaComponent },

      { path: 'ar-code', component: ArCodes },
      { path: 'gl-code', component: GlCode },
      { path: 'accounts', component: Accounts },
      { path: 'payment-terms', component: PaymentTerms },
      { path: 'credit-memo', component: CreditMemo },
      { path: 'credit-memo/:creditMemoId', component: CreditMemoDetail },
    ],
  },
];
