import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Payment, PaymentApplication } from '../../../models/payment.model';

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
  invoices: PaymentApplication[] = [];
  notes = 'No Notes Yet';

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.paymentId = Number(this.route.snapshot.paramMap.get('paymentId'));

    const paymentsData: Payment[] = JSON.parse(localStorage.getItem('paymentsData') || '[]');

    const payment = paymentsData.find((p) => p.id === this.paymentId);

    if (payment) {
      this.customerName = payment.applications?.[0]?.invoice?.customer?.customerName || '--';
      this.paymentDate = payment.paymentDate;
      this.paymentAmount = payment.paymentAmount;
      this.invoices = payment.applications || [];

      const trimmedNotes = payment.notes?.trim();
      if (trimmedNotes) {
        this.notes = trimmedNotes;
      }
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
}
