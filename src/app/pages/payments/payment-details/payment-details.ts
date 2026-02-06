import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BankTransaction, Payment, PaymentApplication } from '../../../models/payment.model';

interface StoredPaymentEntry {
  id: number;
  type: 'MANUAL' | 'BANK';
  tab?: 'DRAFT' | 'APPROVED';
  customerName?: string;
  status?: string;
  amount?: number;
  description?: string;
  source?: string;
  date?: string;
  manualPayment?: Payment;
  bankTransaction?: BankTransaction;
  paymentRecord?: Payment;
}

@Component({
  selector: 'app-payment-details',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './payment-details.html',
  styleUrls: ['./payment-details.css'],
})
export class PaymentDetails implements OnInit {
  paymentId!: number;

  customerName = '';
  paymentDate = '';
  paymentAmount = 0;
  bankDeposit = 0;
  serviceFee = 0;
  invoices: PaymentApplication[] = [];
  notes = 'No Notes Yet';
  isManual = false;
  originTab: 'DRAFT' | 'APPROVED' = 'DRAFT';
  showInvoices = false;
  private paymentRecord: Payment | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const paymentType = this.route.snapshot.paramMap.get('paymentType') as 'MANUAL' | 'BANK';
    this.paymentId = Number(this.route.snapshot.paramMap.get('paymentId'));

    const paymentsData: StoredPaymentEntry[] = JSON.parse(
      localStorage.getItem('paymentsData') || '[]',
    );

    // Find by BOTH id AND type
    const payment = paymentsData.find((p) => p.id === this.paymentId && p.type === paymentType);

    if (payment) {
      this.originTab = payment.tab === 'APPROVED' ? 'APPROVED' : 'DRAFT';
      this.paymentRecord = payment.paymentRecord || payment.manualPayment || null;
      if (payment.type === 'MANUAL' && payment.manualPayment) {
        this.populateManualPayment(payment.manualPayment);
      } else if (payment.bankTransaction) {
        this.populateBankTransaction(payment.bankTransaction);
      } else {
        this.populateFallback(payment);
      }
      this.syncInvoicesFromRecord();
      this.updateInvoiceVisibility();
    }
  }

  /** ---------------- PDF DOWNLOAD ------------------- */
  downloadPDF() {
    const element = document.getElementById('paymentPDF');

    if (!element) return;

    html2canvas(element, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Payment-${this.paymentId}.pdf`);
    });
  }

  private populateManualPayment(payment: Payment) {
    this.isManual = true;
    this.customerName = this.extractManualCustomerName(payment);
    this.paymentDate = payment.paymentDate || '';
    this.paymentAmount = payment.paymentAmount || 0;
    this.bankDeposit = payment.bankDeposit ?? 0;
    this.serviceFee = payment.serviceFee ?? 0;
    this.invoices = payment.applications || [];

    const trimmedNotes = payment.notes?.trim();
    this.notes = trimmedNotes || 'No Notes Yet';
  }

  private populateBankTransaction(payment: BankTransaction) {
    this.isManual = false;
    this.customerName = payment.customerName || '--';
    this.paymentDate = payment.transactionDate || '';
    this.paymentAmount = payment.amount || 0;
    this.bankDeposit = 0;
    this.serviceFee = 0;
    this.invoices = [];

    const note = payment.systemNote?.trim();
    this.notes = note || payment.description?.trim() || 'No Notes Yet';
  }

  private populateFallback(entry: StoredPaymentEntry) {
    this.isManual = entry.type === 'MANUAL';
    this.customerName = entry.customerName || '--';
    this.paymentDate = entry.date || '';
    this.paymentAmount = entry.amount || 0;
    this.bankDeposit = 0;
    this.serviceFee = 0;
    this.invoices = [];

    const trimmedNotes = entry.description?.trim();
    this.notes = trimmedNotes || 'No Notes Yet';
  }

  private syncInvoicesFromRecord() {
    if (this.paymentRecord?.applications) {
      this.invoices = this.paymentRecord.applications;
    }
  }

  private updateInvoiceVisibility() {
    this.showInvoices = this.originTab === 'APPROVED';
  }

  private extractManualCustomerName(payment: Payment): string {
    const directName = payment.customerName?.trim();
    if (directName) {
      return directName;
    }

    return (
      payment.applications?.[0]?.invoice?.customer?.customerName ||
      payment.customer?.customerName ||
      '--'
    );
  }
}
