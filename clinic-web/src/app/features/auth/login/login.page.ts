import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  ReactiveFormsModule, 
  FormBuilder, 
  Validators 
} from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { effect } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    IonicModule, 
    ReactiveFormsModule, 
    RouterModule
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authStore = inject(AuthStore);
  private toastCtrl = inject(ToastController);

  loginForm = this.fb.group({
    email: ['admin@clinic.ph', [Validators.required, Validators.email]],
    password: ['Admin@123456', [Validators.required]],
  });

  showPassword = false;
  isLoading = this.authStore.isLoading;

  constructor() {
    effect(() => {
      const error = this.authStore.error();
      if (error) {
        this.showToast(error, 'danger');
      }

      if (this.authStore.isAuthenticated()) {
        this.authStore.redirectByRole();
      }
    });
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authStore.login({ email: email!, password: password! });
    }
  }

  async showSocialToast(platform: string) {
    const toast = await this.toastCtrl.create({
      message: `${platform} login coming soon`,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
