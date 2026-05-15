import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AnnouncementService } from '../../../services/announcement.service';
import { Announcement } from '../../../models/announcement.model';

@Component({
  selector: 'app-announcement-form',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './announcement-form.component.html',
})
export class AnnouncementFormComponent implements OnInit {
  @Input() announcement?: Announcement;

  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);
  private annService = inject(AnnouncementService);
  private toastCtrl = inject(ToastController);

  annForm!: FormGroup;
  isSubmitting = false;

  ngOnInit() {
    this.annForm = this.fb.group({
      title: [this.announcement?.title || '', Validators.required],
      body: [this.announcement?.body || '', Validators.required],
      imageUrl: [this.announcement?.imageUrl || ''],
      isActive: [this.announcement?.isActive ?? true],
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  onSubmit() {
    if (this.annForm.invalid) return;

    this.isSubmitting = true;
    const payload = this.annForm.value;

    const request = this.announcement 
      ? this.annService.updateAnnouncement(this.announcement.id, payload)
      : this.annService.createAnnouncement(payload);

    request.subscribe({
      next: () => {
        this.showToast(this.announcement ? 'Announcement updated' : 'Announcement created');
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
