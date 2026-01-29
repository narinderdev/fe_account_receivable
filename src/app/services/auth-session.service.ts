import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private signingOut = false;

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private zone: NgZone,
  ) {}

  signOut(message?: string) {
    if (this.signingOut) {
      return;
    }

    const performSignOut = () => {
      this.signingOut = true;

      if (message) {
        this.toastr.error(message);
      }

      localStorage.clear();

      this.router
        .navigateByUrl('/login', { replaceUrl: true })
        .catch(() => {
          window.location.replace('/login');
        })
        .finally(() => {
          this.signingOut = false;
        });
    };

    if (NgZone.isInAngularZone()) {
      performSignOut();
    } else {
      this.zone.run(performSignOut);
    }
  }
}
