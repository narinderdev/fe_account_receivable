import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  setupOpen = false;
  mobileMenuOpen = false;
  mobileSetupOpen = false;
  constructor(private router: Router) {}

  toggleSetup() {
    this.setupOpen = !this.setupOpen;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    this.mobileSetupOpen = false;
  }

  toggleMobileSetup(event: Event) {
    event.stopPropagation();
    this.mobileSetupOpen = !this.mobileSetupOpen;
  }

  signOut() {
    this.closeMobileMenu();
    localStorage.removeItem('isLoggedIn');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
