import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SettingsService } from '../services/settings.service';
import { ClinicSettings } from '../models/settings.model';
import { addIcons } from 'ionicons';
import { saveOutline, businessOutline, brushOutline, calendarOutline, settingsOutline, documentTextOutline } from 'ionicons/icons';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  private settingsService = inject(SettingsService);
  private fb = inject(FormBuilder);
  private toastCtrl = inject(ToastController);

  settingsForm!: FormGroup;
  isLoading = signal(true);
  isSaving = signal(false);

  constructor() {
    addIcons({ saveOutline, businessOutline, brushOutline, calendarOutline, settingsOutline, documentTextOutline });
  }

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.isLoading.set(true);
    this.settingsService.getFullSettings().subscribe({
      next: (settings) => {
        this.initForm(settings);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  initForm(settings: ClinicSettings) {
    this.settingsForm = this.fb.group({
      clinicName: [settings.clinicName, Validators.required],
      logoUrl: [settings.logoUrl],
      primaryColor: [settings.primaryColor, Validators.required],
      secondaryColor: [settings.secondaryColor, Validators.required],
      address: [settings.address, Validators.required],
      phone: [settings.phone, Validators.required],
      email: [settings.email, [Validators.required, Validators.email]],
      facebookUrl: [settings.facebookUrl],
      instagramUrl: [settings.instagramUrl],
      cancellationDeadlineHours: [settings.cancellationDeadlineHours, [Validators.required, Validators.min(0)]],
      isPayAtClinicMode: [settings.isPayAtClinicMode],
      payAtClinicNoShowWindowMinutes: [settings.payAtClinicNoShowWindowMinutes, [Validators.required, Validators.min(0)]],
      patientPortalEnabled: [settings.patientPortalEnabled],
      vaccinationReminderEnabled: [settings.vaccinationReminderEnabled],
      documentHeaderHtml: [settings.documentHeaderHtml],
      documentFooterHtml: [settings.documentFooterHtml],
    });
  }

  onSave() {
    if (this.settingsForm.invalid) return;

    this.isSaving.set(true);
    this.settingsService.updateSettings(this.settingsForm.value).subscribe({
      next: () => {
        this.showToast('Settings saved');
        this.isSaving.set(false);
      },
      error: () => this.isSaving.set(false)
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color: 'success' });
    await toast.present();
  }
}
