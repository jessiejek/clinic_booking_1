import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { homeOutline, calendarOutline, documentTextOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  template: `
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      
      <ion-tab-bar slot="bottom" class="clinic-tab-bar">
        <ion-tab-button tab="home" routerLink="/portal/home" routerLinkActive="tab-selected">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="bookings" routerLink="/portal/my-bookings" routerLinkActive="tab-selected">
          <ion-icon name="calendar-outline"></ion-icon>
          <ion-label>Bookings</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="records" routerLink="/portal/records" routerLinkActive="tab-selected">
          <ion-icon name="document-text-outline"></ion-icon>
          <ion-label>Records</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="profile" routerLink="/portal/profile" routerLinkActive="tab-selected">
          <ion-icon name="person-outline"></ion-icon>
          <ion-label>Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    .clinic-tab-bar {
      --background: var(--clinic-surface);
      --border-color: var(--clinic-border);
      border-top: 1px solid var(--clinic-border);
      padding-top: 4px;
      padding-bottom: env(safe-area-inset-bottom);
      height: calc(60px + env(safe-area-inset-bottom));
    }

    ion-tab-button {
      --color: var(--clinic-text-muted);
      --color-selected: var(--clinic-primary);
    }
    
    ion-tab-button ion-icon {
      font-size: 24px;
      margin-bottom: 4px;
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    ion-tab-button.tab-selected ion-icon {
      transform: scale(1.1);
    }
  `]
})
export class PatientLayoutComponent {
  constructor() {
    addIcons({ homeOutline, calendarOutline, documentTextOutline, personOutline });
  }
}
