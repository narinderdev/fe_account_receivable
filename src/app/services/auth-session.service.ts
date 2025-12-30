import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private signingOut = false;

  constructor(private router: Router, private toastr: ToastrService) {}

  signOut(message?: string) {
    if (this.signingOut) {
      return;
    }

    if (message) {
      this.toastr.error(message);
    }

    this.signingOut = true;
    localStorage.clear();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
