import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { addIcons } from 'ionicons';
import { 
  gridOutline, 
  peopleOutline, 
  medicalOutline, 
  calendarOutline, 
  settingsOutline, 
  megaphoneOutline, 
  logOutOutline,
  personCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  template: `
    <ion-split-pane contentId="main-content">
      <ion-menu contentId="main-content" type="overlay">
        <ion-content>
          <div class="menu-logo">
            <div class="menu-logo__name">Clinic System</div>
            <div class="menu-logo__tagline">Administrator Portal</div>
          </div>

          <ion-list lines="none">
            <ion-item routerLink="/admin/dashboard" routerLinkActive="active">
              <ion-icon slot="start" name="grid-outline"></ion-icon>
              <ion-label>Dashboard</ion-label>
            </ion-item>
            <ion-item routerLink="/admin/doctors" routerLinkActive="active">
              <ion-icon slot="start" name="people-outline"></ion-icon>
              <ion-label>Doctors</ion-label>
            </ion-item>
            <ion-item routerLink="/admin/services" routerLinkActive="active">
              <ion-icon slot="start" name="medical-outline"></ion-icon>
              <ion-label>Services</ion-label>
            </ion-item>
            <ion-item routerLink="/admin/staff" routerLinkActive="active">
              <ion-icon slot="start" name="person-circle-outline"></ion-icon>
              <ion-label>Staff</ion-label>
            </ion-item>
            <ion-item routerLink="/admin/announcements" routerLinkActive="active">
              <ion-icon slot="start" name="megaphone-outline"></ion-icon>
              <ion-label>Announcements</ion-label>
            </ion-item>
            <ion-item routerLink="/admin/settings" routerLinkActive="active">
              <ion-icon slot="start" name="settings-outline"></ion-icon>
              <ion-label>Settings</ion-label>
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

      <div class="ion-page" id="main-content">
        <ion-router-outlet></ion-router-outlet>
      </div>
    </ion-split-pane>
  `,
  styles: [`
    ion-menu ion-content {
      --background: var(--clinic-gray-900);
    }

    .menu-logo {
      padding: var(--space-8) var(--space-6);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      margin-bottom: var(--space-4);
    }

    .menu-logo__name {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      color: #FFFFFF;
    }

    .menu-logo__tagline {
      font-size: var(--text-xs);
      color: var(--clinic-gray-400);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    ion-menu ion-item {
      --background: transparent;
      --color: rgba(255,255,255,0.7);
      --padding-start: var(--space-4);
      --inner-padding-end: var(--space-4);
      border-radius: 12px;
      margin: var(--space-1) var(--space-3);
      font-size: var(--text-base);
      font-weight: 500;
      transition: all 0.2s ease;

      &.active {
        --background: var(--clinic-primary);
        --color: #FFFFFF;
        box-shadow: 0 4px 12px rgba(26, 107, 90, 0.3);
      }

      &:hover:not(.active) {
        --background: rgba(255,255,255,0.05);
        --color: #FFFFFF;
      }

      ion-icon {
        font-size: 20px;
        margin-right: var(--space-2);
      }
    }

    ion-footer {
      background: var(--clinic-gray-900);
      padding: var(--space-4) 0;
    }

    .logout-item {
      --color: var(--clinic-danger);
      margin-top: var(--space-4);
      
      &:hover {
        --background: rgba(217, 48, 37, 0.1);
      }
    }
  `]
})
export class AdminLayoutComponent {
  private authStore = inject(AuthStore);
  private router = inject(Router);

  constructor() {
    addIcons({ 
      gridOutline, 
      peopleOutline, 
      medicalOutline, 
      calendarOutline, 
      settingsOutline, 
      megaphoneOutline, 
      logOutOutline,
      personCircleOutline
    });
  }

  logout() {
    this.authStore.logout();
    this.router.navigate(['/auth/login']);
  }
}
