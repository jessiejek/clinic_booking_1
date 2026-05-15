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
import { AuthStore } from '../../../core/stores/auth.store';
import { StorageService } from '../../../core/services/storage.service';
import { signal } from '@angular/core';
import { patchState } from '@ngrx/signals';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [
    CommonModule, 
    IonicModule, 
    ReactiveFormsModule, 
    RouterModule
  ],
  templateUrl: './set-password.page.html',
  styleUrls: ['./set-password.page.scss'],
})
export class SetPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private authStore = inject(AuthStore);
  private storage = inject(StorageService);
  private toastCtrl = inject(ToastController);
  private route = inject(ActivatedRoute);

  setPasswordForm = this.fb.group({
    password: ['', [
      Validators.required, 
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
    ]],
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
    if (this.setPasswordForm.valid && this.token()) {
      this.isLoading.set(true);
      const { password, confirmPassword } = this.setPasswordForm.value;
      
      this.authService.setPassword(
        this.token()!, 
        password!, 
        confirmPassword!
      ).subscribe({
        next: (response: any) => {
          this.isLoading.set(false);
          this.storage.setTokens(response.accessToken, response.refreshToken);
          this.storage.setUser(response.user);
          // Manually update store since we're not using rxMethod here
          this.authStore.loadUserFromStorage();
          this.showToast('Password set successfully. Welcome!', 'success');
          this.authStore.redirectByRole();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.showToast(err.error?.message || 'Failed to set password', 'danger');
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
