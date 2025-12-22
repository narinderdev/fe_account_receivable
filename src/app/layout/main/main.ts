import { Component } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main',
  imports: [RouterOutlet, Sidebar, Navbar, CommonModule],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {
  hideSidebar = false;
  showNavbar = true;
  showSignoutBar = false;

  constructor(private router: Router) {
    this.updateSidebarVisibility(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        this.updateSidebarVisibility(url);
      });
  }

  private updateSidebarVisibility(url: string) {
    const isAddCompany = url.startsWith('/admin/company/add');
    const isOnboardingComplete = url.startsWith('/admin/company/onboarding-complete');
    const hasCompanies = this.userHasCompanies();

    this.hideSidebar = (isAddCompany && !hasCompanies) || isOnboardingComplete;
    this.showNavbar = !isOnboardingComplete;
    this.showSignoutBar = isAddCompany && !hasCompanies;
  }

  private userHasCompanies(): boolean {
    return localStorage.getItem('hasCompanies') === 'true';
  }

  signOut() {
    localStorage.clear();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
