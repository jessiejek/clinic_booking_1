import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  ReactiveFormsModule, 
  FormBuilder, 
  Validators 
} from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { signal } from '@angular/core';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule, 
    IonicModule, 
    ReactiveFormsModule, 
    RouterModule
  ],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
})
export class ForgotPasswordPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isLoading = signal(false);
  emailSent = signal(false);

  async onSubmit() {
    if (this.forgotForm.valid) {
      this.isLoading.set(true);
      const { email } = this.forgotForm.value;
      
      this.authService.forgotPassword(email!).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.emailSent.set(true);
        },
        error: () => {
          this.isLoading.set(false);
          // Always show success for security or as requested by mock
          this.emailSent.set(true);
        }
      });
    }
  }
}
