import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { StaffAdminService } from '../../../services/staff-admin.service';

@Component({
  selector: 'app-staff-form',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './staff-form.component.html',
})
export class StaffFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);
  private staffService = inject(StaffAdminService);
  private toastCtrl = inject(ToastController);

  staffForm!: FormGroup;
  isSubmitting = false;

  ngOnInit() {
    this.staffForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  onSubmit() {
    if (this.staffForm.invalid) return;

    this.isSubmitting = true;
    this.staffService.createStaff(this.staffForm.value).subscribe({
      next: () => {
        this.showToast('Staff account created. Invite email will be sent when backend is connected.');
        this.modalCtrl.dismiss(true);
      },
      error: () => this.isSubmitting = false
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 3000 });
    await toast.present();
  }
}
