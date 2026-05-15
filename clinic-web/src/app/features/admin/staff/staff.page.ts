import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, personCircleOutline, mailOutline, shieldCheckmarkOutline, powerOutline, refreshOutline } from 'ionicons/icons';
import { StaffAdminService } from '../services/staff-admin.service';
import { StaffMember } from '../models/staff.model';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './staff.page.html',
  styleUrls: ['./staff.page.scss'],
})
export class StaffPage implements OnInit {
  private staffService = inject(StaffAdminService);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  staff = signal<StaffMember[]>([]);
  isLoading = signal(true);

  constructor() {
    addIcons({ addOutline, personCircleOutline, mailOutline, shieldCheckmarkOutline, powerOutline, refreshOutline });
  }

  ngOnInit() {
    this.loadStaff();
  }

  loadStaff() {
    this.isLoading.set(true);
    this.staffService.getStaff().subscribe({
      next: (data) => {
        this.staff.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  async openStaffForm() {
    const { StaffFormComponent } = await import('./components/staff-form/staff-form.component');
    const modal = await this.modalCtrl.create({
      component: StaffFormComponent
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.loadStaff();
    }
  }

  async confirmDeactivate(member: StaffMember) {
    const alert = await this.alertCtrl.create({
      header: 'Deactivate Staff',
      message: `Are you sure you want to deactivate ${member.fullName}? They will no longer be able to log in.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Deactivate',
          role: 'destructive',
          handler: () => {
            this.deactivateStaff(member.id);
          }
        }
      ]
    });

    await alert.present();
  }

  deactivateStaff(id: string) {
    this.staffService.deactivateStaff(id).subscribe({
      next: () => {
        this.showToast('Staff member deactivated');
        this.loadStaff();
      }
    });
  }

  resendInvite(id: string) {
    this.staffService.resendInvite(id).subscribe({
      next: () => this.showToast('Invite email resent')
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000 });
    await toast.present();
  }
}
