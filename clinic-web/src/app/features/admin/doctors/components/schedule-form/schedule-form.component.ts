import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { DoctorAdminService } from '../../../services/doctor-admin.service';
import { DoctorSchedule } from '../../../models/doctor.model';

@Component({
  selector: 'app-schedule-form',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './schedule-form.component.html',
  styles: [`
    .day-row {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
      padding: var(--space-3);
      border: 1px solid var(--clinic-border);
      border-radius: 8px;
      background: var(--clinic-surface);

      &.inactive {
        opacity: 0.6;
        background: var(--clinic-gray-50);
      }
    }

    .day-label {
      width: 100px;
      font-weight: 600;
      color: var(--clinic-gray-900);
    }

    .time-inputs {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex: 1;
    }

    ion-datetime-button {
      --background: var(--clinic-gray-50);
    }
  `]
})
export class ScheduleFormComponent implements OnInit {
  @Input() doctorId!: string;
  @Input() doctorName!: string;

  private modalCtrl = inject(ModalController);
  private doctorService = inject(DoctorAdminService);
  private toastCtrl = inject(ToastController);

  days = [
    { label: 'Monday',    value: 1 },
    { label: 'Tuesday',   value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday',  value: 4 },
    { label: 'Friday',    value: 5 },
    { label: 'Saturday',  value: 6 },
    { label: 'Sunday',    value: 0 },
  ];

  schedules: DoctorSchedule[] = [];
  isSubmitting = false;

  ngOnInit() {
    // Default schedules
    this.schedules = this.days.map(day => ({
      dayOfWeek: day.value,
      startTime: '08:00',
      endTime: '17:00',
      isActive: day.value >= 1 && day.value <= 5 // Mon-Fri active by default
    }));

    // Pre-fill mock data for specific doctors
    if (this.doctorName.includes('Santos')) {
      // Mon-Fri 08:00-17:00 (default is fine)
    } else if (this.doctorName.includes('Reyes')) {
      this.schedules.forEach(s => {
        s.isActive = [1, 3, 5].includes(s.dayOfWeek);
        s.startTime = '09:00';
        s.endTime = '16:00';
      });
    } else if (this.doctorName.includes('Cruz')) {
      this.schedules.forEach(s => {
        s.isActive = [2, 4].includes(s.dayOfWeek);
        s.startTime = '08:00';
        s.endTime = '15:00';
      });
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  onSubmit() {
    this.isSubmitting = true;
    this.doctorService.setSchedule(this.doctorId, this.schedules).subscribe({
      next: () => {
        this.showToast('Schedule updated');
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
