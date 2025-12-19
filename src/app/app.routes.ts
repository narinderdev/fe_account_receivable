import { Routes } from '@angular/router';
import { Main } from './layout/main/main';
import { Dashboard } from './pages/dashboard/dashboard';
import { Customers } from './pages/customers/customers';
import { AddCustomer } from './pages/add-customer/add-customer';
import { Company } from './pages/company/company';
import { AddCompany } from './pages/add-company/add-company';

import { BasicInfo } from './pages/add-company/basic-info/basic-info';
import { CompanyAddress } from './pages/add-company/company-address/company-address';
import { FinancialArSettings } from './pages/add-company/financial-ar-settings/financial-ar-settings';
import { BanksAndPayments } from './pages/add-company/banks-and-payments/banks-and-payments';
// import { UserAndRoles } from './pages/add-company/user-and-roles/user-and-roles';
import { OpeningBalances } from './pages/add-company/opening-balances/opening-balances';
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
import { PaymentDetails } from './pages/payments/payment-details/payment-details';
import { Aging } from './pages/aging/aging';
import { Collections } from './pages/collections/collections';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { AuthGuard } from './guards/auth.guard';
import { SetPassword } from './pages/set-password/set-password';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: 'set-password', component: SetPassword },
  {
    path: 'admin',
    component: Main,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: 'dashboard', component: Dashboard },

      // Customers
      { path: 'customers', component: Customers },
      { path: 'customers/add', component: AddCustomer },
      { path: 'customers/edit/:id', component: AddCustomer },
      { path: 'customers/:id', component: CustomerDetail },
      {
        path: 'customers/:customerId/invoices/:invoiceId',
        component: InvoiceDetail,
      },

      { path: 'company', component: Company },
      {
        path: 'company/add',
        component: AddCompany,
        children: [
          { path: '', redirectTo: 'step-1', pathMatch: 'full' },
          { path: 'step-1', component: BasicInfo },
          { path: 'step-2', component: CompanyAddress },
          { path: 'step-3', component: FinancialArSettings },
          { path: 'step-4', component: BanksAndPayments },
          // { path: 'step-5', component: UserAndRoles },
          // { path: 'step-6', component: OpeningBalances },
          { path: 'complete', component: OnboardingComplete },
        ],
      },

      // EDIT COMPANY FLOW
      {
        path: 'company/edit/:id',
        component: AddCompany,
        children: [
          { path: '', redirectTo: 'step-1', pathMatch: 'full' },
          { path: 'step-1', component: BasicInfo },
          { path: 'step-2', component: CompanyAddress },
          { path: 'step-3', component: FinancialArSettings },
          { path: 'step-4', component: BanksAndPayments },
          // { path: 'step-5', component: UserAndRoles },
          { path: 'complete', component: OnboardingComplete },
        ],
      },

      // Invoices
      { path: 'invoices', component: Invoices },
      { path: 'invoices/create', component: CreateInvoice },
      { path: 'invoices/detail/:invoiceId', component: InvoiceDetail },

      {path:'payments', component: Payments},
      {path:'payments/receive-payment', component: ReceivePayment},
      { path: 'payments/details/:paymentId', component: PaymentDetails },

      {path:'users', component: Users},
      {path:'roles', component: Roles},

      {path:'ar-reports', component: Aging},
      {path:'collections', component: Collections},
    ],
  },
];
