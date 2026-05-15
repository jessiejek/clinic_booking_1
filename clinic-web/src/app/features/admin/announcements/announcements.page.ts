import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, megaphoneOutline, createOutline, trashOutline, calendarOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { AnnouncementService } from '../services/announcement.service';
import { Announcement } from '../models/announcement.model';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './announcements.page.html',
  styleUrls: ['./announcements.page.scss'],
})
export class AnnouncementsPage implements OnInit {
  private annService = inject(AnnouncementService);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  announcements = signal<Announcement[]>([]);
  isLoading = signal(true);

  constructor() {
    addIcons({ addOutline, megaphoneOutline, createOutline, trashOutline, calendarOutline, eyeOutline, eyeOffOutline });
  }

  ngOnInit() {
    this.loadAnnouncements();
  }

  loadAnnouncements() {
    this.isLoading.set(true);
    this.annService.getAnnouncements().subscribe({
      next: (data) => {
        this.announcements.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  async openAnnouncementForm(announcement?: Announcement) {
    const { AnnouncementFormComponent } = await import('./components/announcement-form/announcement-form.component');
    const modal = await this.modalCtrl.create({
      component: AnnouncementFormComponent,
      componentProps: { announcement }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      this.loadAnnouncements();
    }
  }

  async confirmDelete(ann: Announcement) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Announcement',
      message: `Are you sure you want to delete "${ann.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.deleteAnnouncement(ann.id);
          }
        }
      ]
    });

    await alert.present();
  }

  deleteAnnouncement(id: string) {
    this.annService.deleteAnnouncement(id).subscribe({
      next: () => {
        this.showToast('Announcement deleted');
        this.loadAnnouncements();
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000 });
    await toast.present();
  }
}
