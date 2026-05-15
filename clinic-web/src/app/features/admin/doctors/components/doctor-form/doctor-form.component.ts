import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DoctorAdminService } from '../../../services/doctor-admin.service';
import { Doctor } from '../../../models/doctor.model';

@Component({
  selector: 'app-doctor-form',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './doctor-form.component.html',
})
export class DoctorFormComponent implements OnInit {
  @Input() doctor?: Doctor;

  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);
  private doctorService = inject(DoctorAdminService);
  private toastCtrl = inject(ToastController);

  doctorForm!: FormGroup;
  isSubmitting = false;

  ngOnInit() {
    this.doctorForm = this.fb.group({
      fullName: [this.doctor?.fullName || '', Validators.required],
      specialization: [this.doctor?.specialization || '', Validators.required],
      bio: [this.doctor?.bio || ''],
      consultationFee: [this.doctor?.consultationFee || 500, [Validators.required, Validators.min(0)]],
      slotDurationMinutes: [this.doctor?.slotDurationMinutes || 30, Validators.required],
      slotCapacity: [this.doctor?.slotCapacity || 1, [Validators.required, Validators.min(1)]],
      dailyPatientLimit: [this.doctor?.dailyPatientLimit || 20],
      licenseNumber: [this.doctor?.licenseNumber || ''],
      ptrNumber: [this.doctor?.ptrNumber || ''],
      s2Number: [this.doctor?.s2Number || ''],
      status: [this.doctor?.status || 'Active', Validators.required],
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  onSubmit() {
    if (this.doctorForm.invalid) return;

    this.isSubmitting = true;
    const payload = this.doctorForm.value;

    const request = this.doctor 
      ? this.doctorService.updateDoctor(this.doctor.id, payload)
      : this.doctorService.createDoctor(payload);

    request.subscribe({
      next: () => {
        this.showToast(this.doctor ? 'Doctor updated' : 'Doctor created');
        this.modalCtrl.dismiss(true);
      },
      error: () => this.isSubmitting = false
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000 });
    await toast.present();
  }
}
