import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  ReactiveFormsModule, 
  FormBuilder, 
  Validators 
} from '@angular/forms';
import { IonicModule, ToastController, NavController } from '@ionic/angular';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { signal } from '@angular/core';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule, 
    IonicModule, 
    ReactiveFormsModule, 
    RouterModule
  ],
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
})
export class ResetPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);

  resetForm = this.fb.group({
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
  token = signal<string | null>(null);

  ngOnInit() {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
  }

  async onSubmit() {
    if (this.resetForm.valid && this.token()) {
      this.isLoading.set(true);
      const { password, confirmPassword } = this.resetForm.value;
      
      this.authService.resetPassword(
        this.token()!, 
        password!, 
        confirmPassword!
      ).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.showToast('Password reset successfully', 'success');
          this.navCtrl.navigateRoot('/auth/login');
        },
        error: (err) => {
          this.isLoading.set(false);
          this.showToast(err.error?.message || 'Failed to reset password', 'danger');
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
