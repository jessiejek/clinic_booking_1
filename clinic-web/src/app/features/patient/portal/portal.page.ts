import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthStore } from '../../../core/stores/auth.store';

@Component({
  selector: 'app-patient-portal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './portal.page.html',
  styleUrls: ['./portal.page.scss'],
})
export class PortalPage {
  private authStore = inject(AuthStore);
  private toastCtrl = inject(ToastController);
  
  user = this.authStore.user;
  showBanner = signal(true);

  get firstName() {
    return this.user()?.fullName?.split(' ')[0] || 'User';
  }

  logout() {
    this.authStore.logout();
  }

  async resendVerification() {
    const toast = await this.toastCtrl.create({
      message: 'Verification email sent (mock)',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  }

  dismissBanner() {
    this.showBanner.set(false);
  }
}
