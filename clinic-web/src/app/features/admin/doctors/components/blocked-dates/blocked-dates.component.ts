import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { DoctorAdminService } from '../../../services/doctor-admin.service';
import { BlockedDate } from '../../../models/doctor.model';
import { addIcons } from 'ionicons';
import { trashOutline, addOutline } from 'ionicons/icons';

@Component({
  selector: 'app-blocked-dates',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './blocked-dates.component.html',
  styles: [`
    .blocked-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--clinic-border);
      
      &:last-child { border-bottom: none; }

      .date-info {
        h4 { margin: 0 0 2px 0; font-size: var(--text-base); font-weight: 600; }
        p { margin: 0; font-size: var(--text-sm); color: var(--clinic-gray-600); }
      }
    }

    .add-form {
      margin-top: var(--space-6);
      padding: var(--space-4);
      background: var(--clinic-gray-50);
      border-radius: 12px;
      border: 1px dashed var(--clinic-gray-400);
    }
  `]
})
export class BlockedDatesComponent implements OnInit {
  @Input() doctorId!: string;
  @Input() doctorName!: string;

  private modalCtrl = inject(ModalController);
  private doctorService = inject(DoctorAdminService);
  private toastCtrl = inject(ToastController);

  blockedDates = signal<BlockedDate[]>([]);
  isLoading = signal(true);

  newDate = new Date().toISOString();
  newReason = '';

  constructor() {
    addIcons({ trashOutline, addOutline });
  }

  ngOnInit() {
    this.loadBlockedDates();
  }

  loadBlockedDates() {
    this.isLoading.set(true);
    // Mock blocked dates
    setTimeout(() => {
      this.blockedDates.set([
        { id: '1', date: '2025-06-12', reason: 'Independence Day' },
        { id: '2', date: '2025-12-25', reason: 'Christmas' }
      ]);
      this.isLoading.set(false);
    }, 400);
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  addDate() {
    if (!this.newDate) return;
    
    this.doctorService.addBlockedDate(this.doctorId, this.newDate, this.newReason).subscribe({
      next: () => {
        const dateStr = this.newDate.split('T')[0];
        this.blockedDates.update(dates => [...dates, { id: crypto.randomUUID(), date: dateStr, reason: this.newReason }]);
        this.newReason = '';
        this.showToast('Blocked date added');
      }
    });
  }

  removeDate(dateId: string) {
    this.doctorService.removeBlockedDate(this.doctorId, dateId).subscribe({
      next: () => {
        this.blockedDates.update(dates => dates.filter(d => d.id !== dateId));
        this.showToast('Blocked date removed');
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000 });
    await toast.present();
  }
}
