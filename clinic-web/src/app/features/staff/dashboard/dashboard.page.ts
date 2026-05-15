import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthStore } from '../../../core/stores/auth.store';
import { addIcons } from 'ionicons';
import { notificationsOutline, logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="ion-page" id="staff-content">
      <ion-header class="clinic-header">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-menu-button></ion-menu-button>
          </ion-buttons>
          <ion-title>
            <div class="font-display">Clinic System</div>
            <div class="role-label">Staff</div>
          </ion-title>
          <ion-buttons slot="end">
            <ion-button fill="clear">
              <ion-icon name="notifications-outline"></ion-icon>
            </ion-button>
            <ion-button (click)="logout()">
              <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" style="--background: var(--clinic-surface-alt)">
        <h2 class="font-display">Welcome back, {{ firstName }}</h2>
        <p>Staff dashboard placeholder.</p>
      </ion-content>
    </div>
  `,
})
export class DashboardPage {
  private authStore = inject(AuthStore);
  user = this.authStore.user;
  constructor() {
    addIcons({ notificationsOutline, logOutOutline });
  }
  get firstName() { return this.user()?.fullName?.split(' ')[0] || 'User'; }
  logout() { this.authStore.logout(); }
}
