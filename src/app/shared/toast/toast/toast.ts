import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../toast-service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrls: ['./toast.css'],
})
export class Toast {
  constructor(public toastService: ToastService) {}
}
