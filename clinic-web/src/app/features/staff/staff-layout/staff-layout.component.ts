import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { addIcons } from 'ionicons';
import { gridOutline, calendarOutline, peopleOutline, cashOutline, logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-staff-layout',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  template: `
    <ion-split-pane contentId="staff-main-content">
      <ion-menu contentId="staff-main-content" type="overlay">
        <ion-content>
          <div class="menu-logo">
            <div class="menu-logo__name">Clinic System</div>
            <div class="menu-logo__tagline">Staff Portal</div>
          </div>
          <ion-list lines="none">
            <ion-item routerLink="/staff/dashboard" routerLinkActive="active">
              <ion-icon slot="start" name="grid-outline"></ion-icon>
              <ion-label>Dashboard</ion-label>
            </ion-item>
            <ion-item routerLink="/staff/dashboard" routerLinkActive="active">
              <ion-icon slot="start" name="calendar-outline"></ion-icon>
              <ion-label>Appointments</ion-label>
            </ion-item>
            <ion-item routerLink="/staff/dashboard" routerLinkActive="active">
              <ion-icon slot="start" name="people-outline"></ion-icon>
              <ion-label>Patients</ion-label>
            </ion-item>
            <ion-item routerLink="/staff/dashboard" routerLinkActive="active">
              <ion-icon slot="start" name="cash-outline"></ion-icon>
              <ion-label>Billing</ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
        <ion-footer class="ion-no-border">
          <ion-item lines="none" (click)="logout()" class="logout-item" button>
            <ion-icon slot="start" name="log-out-outline"></ion-icon>
            <ion-label>Logout</ion-label>
          </ion-item>
        </ion-footer>
      </ion-menu>

      <div class="ion-page" id="staff-main-content">
        <ion-router-outlet></ion-router-outlet>
      </div>
    </ion-split-pane>
  `,
  styles: [`
    ion-menu ion-content { --background: var(--clinic-gray-900); }
    .menu-logo { padding: var(--space-8) var(--space-6); border-bottom: 1px solid var(--clinic-menu-border); margin-bottom: var(--space-4); }
    .menu-logo__name { font-family: var(--font-display); font-size: var(--text-2xl); color: var(--clinic-white); }
    .menu-logo__tagline { font-size: var(--text-xs); color: var(--clinic-gray-400); margin-top: var(--space-1); text-transform: uppercase; letter-spacing: 0.05em; }
    ion-menu ion-item { --background: transparent; --color: var(--clinic-menu-text); border-radius: 12px; margin: var(--space-1) var(--space-3); }
    ion-menu ion-item.active { --background: var(--clinic-primary); --color: var(--clinic-white); }
    ion-footer { background: var(--clinic-gray-900); padding: var(--space-4) 0; }
    .logout-item { --color: var(--clinic-danger); }
  `]
})
export class StaffLayoutComponent {
  private authStore = inject(AuthStore);

  constructor() {
    addIcons({ gridOutline, calendarOutline, peopleOutline, cashOutline, logOutOutline });
  }

  logout() {
    this.authStore.logout();
  }
}
