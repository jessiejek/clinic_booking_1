import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ServiceAdminService } from '../../../services/service-admin.service';
import { Service } from '../../../models/service.model';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './service-form.component.html',
})
export class ServiceFormComponent implements OnInit {
  @Input() service?: Service;

  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);
  private serviceService = inject(ServiceAdminService);
  private toastCtrl = inject(ToastController);

  serviceForm!: FormGroup;
  isSubmitting = false;

  ngOnInit() {
    this.serviceForm = this.fb.group({
      name: [this.service?.name || '', Validators.required],
      description: [this.service?.description || ''],
      estimatedDurationMinutes: [this.service?.estimatedDurationMinutes || 30, [Validators.required, Validators.min(5)]],
      price: [this.service?.price || 0, [Validators.required, Validators.min(0)]],
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  onSubmit() {
    if (this.serviceForm.invalid) return;

    this.isSubmitting = true;
    const payload = this.serviceForm.value;

    const request = this.service 
      ? this.serviceService.updateService(this.service.id, payload)
      : this.serviceService.createService(payload);

    request.subscribe({
      next: () => {
        this.showToast(this.service ? 'Service updated' : 'Service created');
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
