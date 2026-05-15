import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthStore } from '../../../core/stores/auth.store';
import { addIcons } from 'ionicons';
import { notificationsOutline, logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage {
  private authStore = inject(AuthStore);
  user = this.authStore.user;
  constructor() {
    addIcons({ notificationsOutline, logOutOutline });
  }

  get firstName() {
    return this.user()?.fullName?.split(' ')[0] || 'User';
  }


  logout() {
    this.authStore.logout();
  }
}
