import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../../services/company-service';

@Component({
  selector: 'app-opening-balances',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './opening-balances.html',
  styleUrls: ['./opening-balances.css'],
})
export class OpeningBalances implements OnInit {
  fileUploadForm!: FormGroup;

  selectedFile: File | null = null;
  fileName: string = '';
  fileError: string = '';

  companyId!: number;  // required for API

  constructor(private router: Router, private companyService: CompanyService) {}

  ngOnInit() {
    this.fileUploadForm = new FormGroup({
      file: new FormControl(null, Validators.required),
    });

    this.loadCompanyId();
  }

  // Get company ID
  loadCompanyId() {
    this.companyService.getCompany().subscribe({
      next: (res) => {
        // const company = res?.data?.companies?.[0];
        // if (company) {
        //   this.companyId = company.id;
        // }
      },
      error: () => {
        console.error('Failed to load company');
      },
    });
  }

  // Handle file selection
  onFileSelected(event: any): void {
    const file = event.target.files[0];

    if (!file) {
      this.fileError = 'Please select a CSV file.';
      this.selectedFile = null;
      return;
    }

    const isCSV = file.name.toLowerCase().endsWith('.csv');

    if (!isCSV) {
      this.fileError = 'Only .csv files are allowed.';
      this.selectedFile = null;
      this.fileName = '';
      return;
    }

    this.selectedFile = file;
    this.fileName = file.name;
    this.fileError = '';
    this.fileUploadForm.controls['file'].setValue(file);
  }

  // Submit: upload file
  onSubmit(): void {
  if (!this.selectedFile) {
    this.fileError = 'Please upload a CSV file before continuing.';
    return;
  }

  const formData = new FormData();
  formData.append('file', this.selectedFile); // IMPORTANT: name must match API exactly

  this.companyService.uploadBalance(this.companyId, formData).subscribe({
    next: (res) => {
      console.log('Uploaded Successfully:', res);
      this.router.navigate(['/admin/company/onboarding-complete']);
    },
    error: (err) => {
      console.error('Upload failed:', err);
      this.fileError = 'Failed to upload file. Try again.';
    }
  });
}

  onCancel(): void {
    this.fileUploadForm.reset();
    this.selectedFile = null;
    this.fileName = '';
    this.fileError = '';
  }
}
