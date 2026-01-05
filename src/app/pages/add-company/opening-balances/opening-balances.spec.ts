import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CompanyService } from '../../../services/company-service';

import { OpeningBalances } from './opening-balances';
import { createSpy, createSpyObj } from 'src/testing/spy-helpers';

describe('OpeningBalances', () => {
  const createComponent = () => {
    const router = createSpyObj<Router>('Router', ['navigate']);
    const companyService = createSpyObj<CompanyService>('CompanyService', [
      'uploadBalance',
      'getCompany',
    ]);
    const instance = new OpeningBalances(router, companyService);
    instance.fileUploadForm = new FormGroup({
      file: new FormControl(null),
    });
    return instance;
  };

  it('should create', () => {
    const instance = createComponent();
    expect(instance).toBeTruthy();
  });

  describe('file handling', () => {
    it('rejects non CSV files', () => {
      const instance = createComponent();
      const event = {
        target: {
          files: [{ name: 'document.pdf' }],
        },
      } as unknown as Event;
      instance.onFileSelected(event);
      expect(instance.fileError).toContain('Only .csv files are allowed');
      expect(instance.selectedFile).toBeNull();
    });

    it('accepts CSV files and stores metadata', () => {
      const instance = createComponent();
      const event = {
        target: {
          files: [{ name: 'opening.csv' }],
        },
      } as unknown as Event;
      instance.onFileSelected(event);
      expect(instance.fileError).toBe('');
      expect(instance.fileName).toBe('opening.csv');
    });
  });
});
