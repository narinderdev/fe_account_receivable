import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Customer } from '../../services/customer';
import { CompanySelectionService } from '../../services/company-selection.service';
import { Subject, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { UserContextService } from '../../services/user-context.service';

import { Customers } from './customers';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';
import {
  ApiResponse,
  CustomerCsvUploadResult,
  CustomerEntity,
  CustomerListResponse,
} from '../../models/customer.model';

describe('Customers', () => {
  interface TestContext {
    instance: Customers;
    customerService: ReturnType<typeof createSpyObj<Customer>>;
    toastr: ReturnType<typeof createSpyObj<ToastrService>>;
    router: ReturnType<typeof createSpyObj<Router>>;
    cdr: ChangeDetectorRef;
  }

  const createComponent = (canCreate = true): TestContext => {
    const customerService = createSpyObj<Customer>('Customer', [
      'getCustomers',
      'uploadCsv',
      'downloadTemplate',
    ]);
    customerService.getCustomers.mockReturnValue(of(createCustomerListResponse()));
    customerService.uploadCsv.mockReturnValue(
      of({} as ApiResponse<CustomerCsvUploadResult>),
    );
    const companySelection = {
      selectedCompanyId$: new Subject<number | null>(),
    } as unknown as CompanySelectionService;
    const cdr = { detectChanges: createSpy('detectChanges') } as unknown as ChangeDetectorRef;
    const router = createSpyObj<Router>('Router', ['navigate']);
    const toastr = createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    const userContext = createSpyObj<UserContextService>('UserContextService', ['hasPermission']);
    userContext.hasPermission.mockImplementation((code: string) =>
      code === 'CREATE_CUSTOMER' ? canCreate : true,
    );

    const instance = new Customers(customerService, companySelection, cdr, router, toastr, userContext);

    return {
      instance,
      customerService,
      toastr,
      router,
      cdr,
    };
  };

  it('should create', () => {
    const { instance } = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('helper logic', () => {
    it('does not open import modal when user lacks permission', () => {
      const { instance } = createComponent(false);
      instance.openImportModal();
      expect(instance.isImportModalOpen).toBe(false);
    });

    it('returns avatar colors consistently', () => {
      const { instance } = createComponent();
      expect(instance.getInitialColor(0)).toEqual({ background: '#DBEAFE', color: '#2563EB' });
      expect(instance.getInitialColor(6)).toEqual({ background: '#DBEAFE', color: '#2563EB' });
    });
  });

  describe('search filtering', () => {
    let nextId = 1;
    const buildCustomer = (name: string): CustomerEntity =>
      ({
        id: nextId++,
        customerName: name,
      }) as CustomerEntity;

    it('filters customers by customer name', () => {
      const { instance } = createComponent();
      instance.customers = [buildCustomer('Alpha Inc'), buildCustomer('Beta LLC')];

      instance.onSearchInput('beta');

      expect(instance.filteredCustomers).toHaveLength(1);
      expect(instance.filteredCustomers[0].customerName).toBe('Beta LLC');
    });

    it('resets filter when search term is cleared', () => {
      const { instance } = createComponent();
      instance.customers = [buildCustomer('Alpha Inc'), buildCustomer('Beta LLC')];

      instance.onSearchInput('alp');
      instance.onSearchInput('   ');

      expect(instance.filteredCustomers).toHaveLength(2);
    });
  });

  describe('file upload validation', () => {
    it('validates CSV file extensions', () => {
      const { instance, toastr } = createComponent();
      instance.activeCompanyId = 1;

      const validFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      const event = {
        target: {
          files: [validFile],
        },
      } as any;

      instance.handleFileUpload(event);

      expect(toastr.warning).not.toHaveBeenCalled();
    });

    it('validates Excel file extensions', () => {
      const { instance, toastr } = createComponent();
      instance.activeCompanyId = 1;

      const validFile = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const event = {
        target: {
          files: [validFile],
        },
      } as any;

      instance.handleFileUpload(event);

      expect(toastr.warning).not.toHaveBeenCalled();
    });

    it('rejects invalid file extensions', () => {
      const { instance, toastr } = createComponent();
      instance.activeCompanyId = 1;

      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const event = {
        target: {
          files: [invalidFile],
        },
      } as any;

      instance.handleFileUpload(event);

      expect(toastr.warning).toHaveBeenCalledWith(
        'Please upload a valid CSV or Excel file (.csv, .xlsx, .xls).',
        'Warning',
      );
    });

    it('warns if no company is selected', () => {
      const { instance, toastr } = createComponent();
      instance.activeCompanyId = null;

      const validFile = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const event = {
        target: {
          files: [validFile],
        },
      } as any;

      instance.handleFileUpload(event);

      expect(toastr.warning).toHaveBeenCalledWith('Please select a company first!', 'Warning');
    });
  });
});

function createCustomerListResponse(): CustomerListResponse {
  return {
    statusCode: 200,
    status: 'success',
    message: 'ok',
    data: {
      rows: [],
      content: [],
      totalPages: 0,
      number: 0,
      size: 0,
      totalElements: 0,
      first: true,
      last: true,
    },
  };
}
