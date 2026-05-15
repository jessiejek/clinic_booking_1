import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthStore } from '../../../core/stores/auth.store';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header class="clinic-header">
      <ion-toolbar>
        <ion-title class="clinic-page-title font-display">Doctor Portal</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="logout()">
            <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding" style="--background: var(--clinic-surface-alt)">
      <h2 class="font-display">Welcome, {{ user()?.fullName }}</h2>
      <p>Doctor portal placeholder.</p>
    </ion-content>
  `,
})
export class DashboardPage {
  private authStore = inject(AuthStore);
  user = this.authStore.user;
  logout() { this.authStore.logout(); }
}
