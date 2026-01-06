import { AbstractControl, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyService } from '../../../services/company-service';

import { CompanyAddress } from './company-address';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('CompanyAddress', () => {
  const createComponent = () => {
    const fb = new FormBuilder();
    const route = { parent: { snapshot: { params: {} } } } as ActivatedRoute;
    const router = createSpyObj<Router>('Router', ['navigate']);
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'createAddress',
      'setEditingCompany',
    ]);
    const instance = new CompanyAddress(fb, route, router, companyService);
    instance.buildForm();
    return instance;
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('validators', () => {
    it('enforces a word limit in text fields', () => {
      const instance = createComponent();
      const validator = instance.wordLimitValidator(2);
      expect(validator(mockControl('one two'))).toBeNull();
      expect(validator(mockControl('one two three'))).toEqual({
        wordLimit: true,
      });
    });

    it('only allows digits inside the postal code input', () => {
      const instance = createComponent();
      instance.addressForm.get('postalCode')?.setValue('abc');
      instance.onPostalInput();
      expect(instance.addressForm.get('postalCode')?.value).toBe('');
      instance.addressForm.get('postalCode')?.setValue('12AB3499');
      instance.onPostalInput();
      expect(instance.addressForm.get('postalCode')?.value).toBe('123499');
    });
  });
});

function mockControl(value: string | null): AbstractControl {
  return { value } as unknown as AbstractControl;
}
