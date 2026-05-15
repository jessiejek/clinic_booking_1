import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, clipboardOutline, createOutline, trashOutline, timeOutline } from 'ionicons/icons';
import { ServiceAdminService } from '../services/service-admin.service';
import { Service } from '../models/service.model';
import { PesoPipe } from '../../../shared/pipes/peso.pipe';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, PesoPipe],
  templateUrl: './services.page.html',
  styleUrls: ['./services.page.scss'],
})
export class ServicesPage implements OnInit {
  private serviceService = inject(ServiceAdminService);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private fb = inject(FormBuilder);

  services = signal<Service[]>([]);
  isLoading = signal(true);

  constructor() {
    addIcons({ addOutline, clipboardOutline, createOutline, trashOutline, timeOutline });
  }

  ngOnInit() {
    this.loadServices();
  }

  loadServices() {
    this.isLoading.set(true);
    this.serviceService.getServices().subscribe({
      next: (data) => {
        this.services.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  async openServiceForm(service?: Service) {
    const { ServiceFormComponent } = await import('./components/service-form/service-form.component');
    const modal = await this.modalCtrl.create({
      component: ServiceFormComponent,
      componentProps: { service }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.loadServices();
    }
  }

  async confirmDelete(service: Service) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Service',
      message: `Are you sure you want to remove "${service.name}"? This will affect any doctors linked to this service.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.deleteService(service.id);
          }
        }
      ]
    });

    await alert.present();
  }

  deleteService(id: string) {
    this.serviceService.deleteService(id).subscribe({
      next: () => {
        this.showToast('Service deleted successfully');
        this.loadServices();
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000 });
    await toast.present();
  }
}
