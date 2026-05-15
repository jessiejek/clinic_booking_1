import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { addOutline, medicalOutline, ellipsisVerticalOutline, createOutline, trashOutline, calendarOutline, timeOutline, linkOutline, banOutline } from 'ionicons/icons';
import { DoctorAdminService } from '../services/doctor-admin.service';
import { Doctor } from '../models/doctor.model';
import { PesoPipe } from '../../../shared/pipes/peso.pipe';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, PesoPipe],
  templateUrl: './doctors.page.html',
  styleUrls: ['./doctors.page.scss'],
})
export class DoctorsPage implements OnInit {
  private doctorService = inject(DoctorAdminService);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  doctors = signal<Doctor[]>([]);
  isLoading = signal(true);

  constructor() {
    addIcons({ 
      addOutline, 
      medicalOutline, 
      ellipsisVerticalOutline, 
      createOutline, 
      trashOutline, 
      calendarOutline, 
      timeOutline, 
      linkOutline, 
      banOutline 
    });
  }

  ngOnInit() {
    this.loadDoctors();
  }

  loadDoctors() {
    this.isLoading.set(true);
    this.doctorService.getDoctors().subscribe({
      next: (data) => {
        this.doctors.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  async openDoctorForm(doctor?: Doctor) {
    // TODO: Implement Doctor Form Modal
    const { DoctorFormComponent } = await import('./components/doctor-form/doctor-form.component');
    const modal = await this.modalCtrl.create({
      component: DoctorFormComponent,
      componentProps: { doctor }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.loadDoctors();
    }
  }

  async openScheduleForm(doctor: Doctor) {
    const { ScheduleFormComponent } = await import('./components/schedule-form/schedule-form.component');
    const modal = await this.modalCtrl.create({
      component: ScheduleFormComponent,
      componentProps: { doctorId: doctor.id, doctorName: doctor.fullName }
    });
    await modal.present();
  }

  async openBlockedDates(doctor: Doctor) {
    const { BlockedDatesComponent } = await import('./components/blocked-dates/blocked-dates.component');
    const modal = await this.modalCtrl.create({
      component: BlockedDatesComponent,
      componentProps: { doctorId: doctor.id, doctorName: doctor.fullName }
    });
    await modal.present();
  }

  async confirmDelete(doctor: Doctor) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Doctor',
      message: `Are you sure you want to remove Dr. ${doctor.fullName}? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.deleteDoctor(doctor.id);
          }
        }
      ]
    });

    await alert.present();
  }

  deleteDoctor(id: string) {
    this.doctorService.deleteDoctor(id).subscribe({
      next: () => {
        this.showToast('Doctor deleted successfully');
        this.loadDoctors();
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'Active': return 'badge-confirmed';
      case 'Inactive': return 'badge-expired';
      case 'OnLeave': return 'badge-on-hold';
      default: return '';
    }
  }
}
