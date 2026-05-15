import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  ReactiveFormsModule, 
  FormBuilder, 
  Validators 
} from '@angular/forms';
import { IonicModule, ToastController, NavController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { signal } from '@angular/core';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, 
    IonicModule, 
    ReactiveFormsModule, 
    RouterModule
  ],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);
  private navCtrl = inject(NavController);

  registerForm = this.fb.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  }, {
    validators: (group: any) => {
      const pass = group.get('password').value;
      const confirm = group.get('confirmPassword').value;
      return pass === confirm ? null : { mismatch: true };
    }
  });

  isLoading = signal(false);

  async onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      const { fullName, email, password, confirmPassword } = this.registerForm.value;
      
      this.authService.register({ 
        fullName: fullName!, 
        email: email!, 
        password: password!, 
        confirmPassword: confirmPassword! 
      }).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.showToast('Registration successful! Please log in.', 'success');
          this.navCtrl.navigateRoot('/auth/login');
        },
        error: (err) => {
          this.isLoading.set(false);
          this.showToast(err.error?.message || 'Registration failed', 'danger');
        }
      });
    }
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
